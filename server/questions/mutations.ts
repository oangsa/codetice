import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";

import { questions, testcases } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { QuestionInput, TestcaseInput } from "@/server/questions/types";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceStaff } from "@/server/workspaces/authorization";

type Db = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function lockWorkspaceQuestion(tx: Transaction, workspaceId: string, questionId: string) {
  const rows = await tx.execute<{ id: string }>(sql`
    select id from questions
    where workspace_id = ${workspaceId} and id = ${questionId}
    for update
  `);
  if (rows.length === 0) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
}

async function createUniqueQuestionSlug(workspaceId: string, title: string, questionId?: string) {
  const db = getDb();
  const baseSlug = slugify(title).slice(0, 240) || "question";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db.query.questions.findFirst({
      where: and(
        eq(questions.workspaceId, workspaceId),
        eq(questions.slug, slug),
        questionId ? ne(questions.id, questionId) : undefined,
      ),
      columns: { id: true },
    });
    if (!existing) return slug;
    const suffixText = `-${suffix}`;
    slug = `${baseSlug.slice(0, 255 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
}

export async function createWorkspaceQuestion(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  question: QuestionInput;
  testcases: TestcaseInput[];
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  if (input.question.isPublished && input.testcases.length === 0) {
    throw new AppError(Messages.publishNeedsTestcase, 400, ErrorCode.VALIDATION);
  }
  const slug = await createUniqueQuestionSlug(input.workspaceId, input.question.title);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [question] = await tx.insert(questions).values({
      workspaceId: input.workspaceId,
      title: input.question.title,
      slug,
      description: input.question.description,
      difficulty: input.question.difficulty,
      totalScore: input.question.totalScore.toFixed(2),
      timeLimitMs: input.question.timeLimitMs,
      memoryLimitMb: input.question.memoryLimitMb,
      starterCode: input.question.starterCode ?? "",
      starterCodeByLanguage: JSON.stringify(input.question.starterCodeByLanguage ?? {}),
      allowedLanguages: input.question.allowedLanguages ? JSON.stringify(input.question.allowedLanguages) : null,
      isPublished: input.question.isPublished,
      createdBy: input.actor.userId,
    }).returning();
    if (!question) throw new AppError(Messages.unableToCreateQuestion, 500, ErrorCode.INTERNAL);

    if (input.testcases.length > 0) {
      await tx.insert(testcases).values(input.testcases.map((testcase) => ({
        questionId: question.id,
        name: testcase.name ?? null,
        input: testcase.input,
        expectedOutput: testcase.expectedOutput,
        isSample: testcase.isSample,
        isHidden: testcase.isHidden,
        checkerType: testcase.checkerType ?? "exact",
        floatTolerance: testcase.floatTolerance?.toString() ?? null,
        sortOrder: testcase.sortOrder,
      })));
    }

    return question;
  });
}

export async function updateWorkspaceQuestion(
  actor: WorkspaceActor,
  workspaceId: string,
  questionId: string,
  input: QuestionInput,
) {
  await requireWorkspaceStaff(actor, workspaceId);
  const slug = await createUniqueQuestionSlug(workspaceId, input.title, questionId);
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockWorkspaceQuestion(tx, workspaceId, questionId);
    if (input.isPublished) {
      const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(testcases)
        .innerJoin(questions, eq(questions.id, testcases.questionId))
        .where(and(eq(questions.workspaceId, workspaceId), eq(testcases.questionId, questionId)));
      if ((count?.count ?? 0) === 0) {
        throw new AppError(Messages.publishNeedsTestcase, 400, ErrorCode.VALIDATION);
      }
    }
    const [updated] = await tx.update(questions).set({
      title: input.title,
      slug,
      description: input.description,
      difficulty: input.difficulty,
      totalScore: input.totalScore.toFixed(2),
      timeLimitMs: input.timeLimitMs,
      memoryLimitMb: input.memoryLimitMb,
      starterCode: input.starterCode ?? "",
      starterCodeByLanguage: JSON.stringify(input.starterCodeByLanguage ?? {}),
      allowedLanguages: input.allowedLanguages ? JSON.stringify(input.allowedLanguages) : null,
      isPublished: input.isPublished,
      updatedAt: new Date(),
    }).where(and(eq(questions.workspaceId, workspaceId), eq(questions.id, questionId))).returning();
    if (!updated) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
    return updated;
  });
}

export async function deleteWorkspaceQuestion(actor: WorkspaceActor, workspaceId: string, questionId: string) {
  await requireWorkspaceStaff(actor, workspaceId);
  const db = getDb();
  const [deleted] = await db.delete(questions).where(and(
    eq(questions.workspaceId, workspaceId),
    eq(questions.id, questionId),
  )).returning({ id: questions.id });
  if (!deleted) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
}

export async function createWorkspaceTestcase(actor: WorkspaceActor, workspaceId: string, questionId: string, input: TestcaseInput) {
  await requireWorkspaceStaff(actor, workspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockWorkspaceQuestion(tx, workspaceId, questionId);
    const [created] = await tx.insert(testcases).values({
      questionId,
      name: input.name ?? null,
      input: input.input,
      expectedOutput: input.expectedOutput,
      isSample: input.isSample,
      isHidden: input.isHidden,
      checkerType: input.checkerType ?? "exact",
      floatTolerance: input.floatTolerance?.toString() ?? null,
      sortOrder: input.sortOrder,
    }).returning();
    return created;
  });
}

export async function updateWorkspaceTestcase(
  actor: WorkspaceActor,
  workspaceId: string,
  questionId: string,
  testcaseId: string,
  input: TestcaseInput,
) {
  await requireWorkspaceStaff(actor, workspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockWorkspaceQuestion(tx, workspaceId, questionId);
    const [updated] = await tx.update(testcases).set({
      name: input.name ?? null,
      input: input.input,
      expectedOutput: input.expectedOutput,
      isSample: input.isSample,
      isHidden: input.isHidden,
      checkerType: input.checkerType ?? "exact",
      floatTolerance: input.floatTolerance?.toString() ?? null,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    }).where(and(eq(testcases.id, testcaseId), eq(testcases.questionId, questionId))).returning();
    if (!updated) throw new AppError(Messages.testcaseNotFound, 404, ErrorCode.NOT_FOUND);
    return updated;
  });
}

export async function deleteWorkspaceTestcase(actor: WorkspaceActor, workspaceId: string, questionId: string, testcaseId: string) {
  await requireWorkspaceStaff(actor, workspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockWorkspaceQuestion(tx, workspaceId, questionId);
    const [deleted] = await tx.delete(testcases).where(and(
      eq(testcases.id, testcaseId),
      eq(testcases.questionId, questionId),
    )).returning({ id: testcases.id });
    if (!deleted) throw new AppError(Messages.testcaseNotFound, 404, ErrorCode.NOT_FOUND);
    const [remaining] = await tx.select({ count: sql<number>`count(*)::int` }).from(testcases)
      .where(eq(testcases.questionId, questionId));
    if ((remaining?.count ?? 0) === 0) {
      await tx.update(questions).set({ isPublished: false, updatedAt: new Date() }).where(and(
        eq(questions.workspaceId, workspaceId),
        eq(questions.id, questionId),
      ));
    }
  });
}
