import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { customCheckers, questionTags, questions, tags, testcases, workspaces } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { mapTagsForQuestionClone, type DatabaseTransaction } from "@/server/tags/service";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import {
  requireWorkspaceAdmin,
  requireWorkspaceStaff,
} from "@/server/workspaces/authorization";
import { generateWorkspaceInviteCode } from "@/server/workspaces/invite-code";

type CloneSourceQuestion = typeof questions.$inferSelect & {
  testcases: Array<typeof testcases.$inferSelect>;
  customCheckers: Array<typeof customCheckers.$inferSelect>;
  questionTags: Array<{ tag: typeof tags.$inferSelect | null }>;
};

export type WorkspaceCloneSelection = {
  questionId: string;
  include: boolean;
  isPublished: boolean;
};

async function createUniqueCloneSlug(
  tx: DatabaseTransaction,
  workspaceId: string,
  sourceSlug: string,
) {
  const sourceBase = slugify(sourceSlug).slice(0, 250) || "question";
  const baseSlug = `${sourceBase.slice(0, 250)}-copy`;
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await tx.query.questions.findFirst({
      where: and(eq(questions.workspaceId, workspaceId), eq(questions.slug, slug)),
      columns: { id: true },
    });
    if (!existing) return slug;
    const suffixText = `-${suffix}`;
    slug = `${baseSlug.slice(0, 255 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
}

async function cloneQuestionIntoWorkspace(input: {
  tx: DatabaseTransaction;
  source: CloneSourceQuestion;
  targetWorkspaceId: string;
  actorId: string;
  isPublished: boolean;
}) {
  if (input.isPublished && input.source.testcases.length === 0) {
    throw new AppError(Messages.publishNeedsTestcase, 400, ErrorCode.VALIDATION);
  }

  const slug = await createUniqueCloneSlug(input.tx, input.targetWorkspaceId, input.source.slug);
  const [question] = await input.tx.insert(questions).values({
    workspaceId: input.targetWorkspaceId,
    title: input.source.title,
    slug,
    description: input.source.description,
    difficulty: input.source.difficulty,
    totalScore: input.source.totalScore,
    timeLimitMs: input.source.timeLimitMs,
    memoryLimitMb: input.source.memoryLimitMb,
    starterCode: input.source.starterCode,
    starterCodeByLanguage: input.source.starterCodeByLanguage,
    allowedLanguages: input.source.allowedLanguages,
    isPublished: input.isPublished,
    createdBy: input.actorId,
  }).returning();
  if (!question) throw new AppError(Messages.unableToCreateQuestion, 500, ErrorCode.INTERNAL);

  if (input.source.testcases.length > 0) {
    await input.tx.insert(testcases).values(input.source.testcases.map((testcase) => ({
      questionId: question.id,
      name: testcase.name,
      input: testcase.input,
      expectedOutput: testcase.expectedOutput,
      isSample: testcase.isSample,
      isHidden: testcase.isHidden,
      checkerType: testcase.checkerType,
      floatTolerance: testcase.floatTolerance,
      sortOrder: testcase.sortOrder,
    })));
  }

  if (input.source.customCheckers.length > 0) {
    await input.tx.insert(customCheckers).values(input.source.customCheckers.map((checker) => ({
      questionId: question.id,
      language: checker.language,
      sourceCode: checker.sourceCode,
    })));
  }

  const targetTagIds = await mapTagsForQuestionClone(
    input.tx,
    input.targetWorkspaceId,
    input.source.questionTags.flatMap(({ tag }) => tag ? [{
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isPreset: tag.isPreset,
    }] : []),
  );
  if (targetTagIds.length > 0) {
    await input.tx.insert(questionTags).values(targetTagIds.map((tagId) => ({ questionId: question.id, tagId })));
  }

  return question;
}

async function getCloneSourceQuestion(
  tx: DatabaseTransaction,
  workspaceId: string,
  questionId: string,
) {
  return tx.query.questions.findFirst({
    where: and(eq(questions.workspaceId, workspaceId), eq(questions.id, questionId)),
    with: {
      testcases: { orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)] },
      customCheckers: true,
      questionTags: { with: { tag: true } },
    },
  });
}

const MAX_INVITE_CODE_ATTEMPTS = 10;

async function createWorkspaceWithInviteCode(
  tx: DatabaseTransaction,
  input: { name: string; ownerId: string },
) {
  for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
    const [workspace] = await tx.insert(workspaces).values({
      ...input,
      inviteCode: generateWorkspaceInviteCode(),
    }).onConflictDoNothing().returning();

    if (workspace) return workspace;
  }

  throw new AppError(Messages.unableToCreateWorkspace, 500, ErrorCode.INTERNAL);
}

export async function cloneWorkspaceQuestion(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  targetWorkspaceId: string;
  isPublished: boolean;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  await requireWorkspaceStaff(input.actor, input.targetWorkspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    const source = await getCloneSourceQuestion(tx, input.workspaceId, input.questionId);
    if (!source) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
    return cloneQuestionIntoWorkspace({
      tx,
      source,
      targetWorkspaceId: input.targetWorkspaceId,
      actorId: input.actor.userId,
      isPublished: input.isPublished,
    });
  });
}

export async function cloneWorkspace(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  name: string;
  questions: WorkspaceCloneSelection[];
}) {
  await requireWorkspaceAdmin(input.actor, input.workspaceId);
  const questionIds = input.questions.map((question) => question.questionId);
  if (new Set(questionIds).size !== questionIds.length) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    const sources = questionIds.length === 0
      ? []
      : await tx.query.questions.findMany({
          where: and(eq(questions.workspaceId, input.workspaceId), inArray(questions.id, questionIds)),
          with: {
            testcases: { orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)] },
            customCheckers: true,
            questionTags: { with: { tag: true } },
          },
        });
    if (sources.length !== questionIds.length) {
      throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
    }

    const sourceById = new Map(sources.map((question) => [question.id, question]));
    for (const selection of input.questions) {
      const source = sourceById.get(selection.questionId);
      if (!source) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
      if (selection.include && selection.isPublished && source.testcases.length === 0) {
        throw new AppError(Messages.publishNeedsTestcase, 400, ErrorCode.VALIDATION);
      }
    }

    const workspace = await createWorkspaceWithInviteCode(tx, {
      name: input.name,
      ownerId: input.actor.userId,
    });

    const clonedQuestions = [];
    for (const selection of input.questions) {
      if (!selection.include) continue;
      const source = sourceById.get(selection.questionId);
      if (!source) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
      clonedQuestions.push(await cloneQuestionIntoWorkspace({
        tx,
        source,
        targetWorkspaceId: workspace.id,
        actorId: input.actor.userId,
        isPublished: selection.isPublished,
      }));
    }

    return { workspace, questions: clonedQuestions };
  });
}
