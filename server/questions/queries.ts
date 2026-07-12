import "server-only";

import { and, desc, eq, gt, lt, or } from "drizzle-orm";

import { questions, testcases } from "@/db/schema";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { assertQuestionParent } from "@/server/questions/ownership";
import { personalQuestionProgress } from "@/server/questions/personal-progress";

function parseQuestionJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseQuestionCursor(
  cursor: string | null,
  workspaceId: string,
  includeDrafts: boolean,
) {
  if (!cursor) return undefined;
  const endpoint = "workspace-questions";
  const filters = `drafts=${includeDrafts}`;
  try {
    const decoded = decodeCursor(cursor, { endpoint, scope: workspaceId, filters });
    const [createdAtValue, id] = decoded.keys;
    if (typeof createdAtValue !== "string" || typeof id !== "string") throw new Error();
    const createdAt = new Date(createdAtValue);
    if (Number.isNaN(createdAt.getTime())) throw new Error();
    return or(
      lt(questions.createdAt, createdAt),
      and(eq(questions.createdAt, createdAt), lt(questions.id, id)),
    );
  } catch {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
}

export async function listWorkspaceQuestionsPage(input: {
  workspaceId: string;
  userId: string;
  includeDrafts: boolean;
  limit: number;
  cursor: string | null;
}) {
  const db = getDb();
  const cursorWhere = parseQuestionCursor(input.cursor, input.workspaceId, input.includeDrafts);
  const personalProgress = personalQuestionProgress(input.userId);
  const rows = await db.select({
    id: questions.id,
    title: questions.title,
    slug: questions.slug,
    difficulty: questions.difficulty,
    totalScore: questions.totalScore,
    isPublished: questions.isPublished,
    createdAt: questions.createdAt,
    ...personalProgress,
  }).from(questions)
    .where(and(
      eq(questions.workspaceId, input.workspaceId),
      input.includeDrafts ? undefined : eq(questions.isPublished, true),
      cursorWhere,
    ))
    .orderBy(desc(questions.createdAt), desc(questions.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((row) => {
    const best = Number(row.bestScore ?? 0);
    const total = Number(row.totalScore);
    const attempts = row.attempts ?? 0;
    return {
      ...row,
      attempts,
      status: attempts === 0 ? "todo" as const : best >= total ? "accepted" as const : "attempted" as const,
    };
  });
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({
      endpoint: "workspace-questions",
      scope: input.workspaceId,
      filters: `drafts=${input.includeDrafts}`,
      keys: [last.createdAt.toISOString(), last.id],
    }) : null,
  };
}

export async function getWorkspaceQuestionBySlug(input: {
  workspaceId: string;
  slug: string;
  includeDrafts: boolean;
}) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: and(
      eq(questions.workspaceId, input.workspaceId),
      eq(questions.slug, input.slug),
      input.includeDrafts ? undefined : eq(questions.isPublished, true),
    ),
    with: {
      testcases: {
        where: input.includeDrafts ? undefined : eq(testcases.isSample, true),
        orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)],
      },
    },
  });
  if (!question) return null;
  return {
    ...question,
    starterCodeByLanguage: parseQuestionJson<Record<string, string>>(question.starterCodeByLanguage, {}),
    allowedLanguages: parseQuestionJson<string[]>(question.allowedLanguages, []),
  };
}

export async function getWorkspaceQuestionById(workspaceId: string, questionId: string) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: and(eq(questions.workspaceId, workspaceId), eq(questions.id, questionId)),
    with: {
      testcases: { orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)] },
    },
  });
  if (!question) return null;
  return {
    ...question,
    starterCodeByLanguage: parseQuestionJson<Record<string, string>>(question.starterCodeByLanguage, {}),
    allowedLanguages: parseQuestionJson<string[]>(question.allowedLanguages, []),
  };
}

export async function listWorkspaceTestcases(
  workspaceId: string,
  questionId: string,
  includeHidden: boolean,
  limit: number,
  cursor: string | null,
) {
  await assertQuestionParent(workspaceId, questionId);
  const db = getDb();
  const endpoint = "workspace-testcases";
  const scope = `${workspaceId}:${questionId}`;
  const filters = `hidden=${includeHidden}`;
  let after: ReturnType<typeof or> | undefined;
  if (cursor) {
    try {
      const decoded = decodeCursor(cursor, { endpoint, scope, filters });
      const [sortOrder, createdAtValue, id] = decoded.keys;
      if (typeof sortOrder !== "number" || typeof createdAtValue !== "string" || typeof id !== "string") throw new Error();
      const createdAt = new Date(createdAtValue);
      if (Number.isNaN(createdAt.getTime())) throw new Error();
      after = or(
        gt(testcases.sortOrder, sortOrder),
        and(eq(testcases.sortOrder, sortOrder), gt(testcases.createdAt, createdAt)),
        and(eq(testcases.sortOrder, sortOrder), eq(testcases.createdAt, createdAt), gt(testcases.id, id)),
      );
    } catch {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
  }
  const rows = await db.query.testcases.findMany({
    where: and(
      eq(testcases.questionId, questionId),
      includeHidden ? undefined : eq(testcases.isSample, true),
      after,
    ),
    columns: {
      id: true,
      name: true,
      input: true,
      expectedOutput: true,
      isSample: true,
      isHidden: true,
      checkerType: true,
      floatTolerance: true,
      sortOrder: true,
      createdAt: true,
    },
    orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt), ops.asc(fields.id)],
    limit: limit + 1,
  });
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({
      endpoint,
      scope,
      filters,
      keys: [last.sortOrder, last.createdAt.toISOString(), last.id],
    }) : null,
  };
}
