import "server-only";

import { and, desc, eq, gt, ilike, lt, or, sql, type SQL } from "drizzle-orm";

import { questions, testcases } from "@/db/schema";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { escapeLikePattern, parseCollectionSearch, type ParsedCollectionSearch } from "@/lib/collection-search";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { personalQuestionProgress } from "@/server/questions/personal-progress";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";

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
  filters: string,
) {
  if (!cursor) return undefined;
  const endpoint = "workspace-questions";
  try {
    const decoded = decodeCursor(cursor, { endpoint, scope: workspaceId, filters });
    const [createdAtValue, id] = decoded.keys;
    if (typeof createdAtValue !== "string" || typeof id !== "string") throw new Error();
    if (createdAtValue.length > 64 || Number.isNaN(new Date(createdAtValue).getTime())) throw new Error();
    return or(
      sql`${questions.createdAt} < ${createdAtValue}::timestamp`,
      and(sql`${questions.createdAt} = ${createdAtValue}::timestamp`, lt(questions.id, id)),
    );
  } catch {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
}

export const workspaceQuestionSearchConfig = {
  fields: {
    title: ["CONTAINS", "STARTWITH", "EQUAL"] as const,
    slug: ["CONTAINS", "STARTWITH", "EQUAL"] as const,
    difficulty: ["EQUAL", "NOTEQUAL"] as const,
    isPublished: ["EQUAL"] as const,
    status: ["EQUAL", "NOTEQUAL"] as const,
  },
  searchTermFields: ["title", "slug"] as const,
};

function textCondition(column: typeof questions.title | typeof questions.slug, condition: string, value: string) {
  if (condition === "CONTAINS") return ilike(column, `%${escapeLikePattern(value)}%`);
  if (condition === "STARTWITH") return ilike(column, `${escapeLikePattern(value)}%`);
  if (condition === "EQUAL") return eq(column, value);
  throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
}

function questionSearchWhere(search: ParsedCollectionSearch, progress: ReturnType<typeof personalQuestionProgress>) {
  const conditions: SQL[] = [];
  for (const item of search.search) {
    if (item.name === "title" || item.name === "slug") {
      conditions.push(textCondition(item.name === "title" ? questions.title : questions.slug, item.condition, String(item.value)));
      continue;
    }
    if (item.name === "difficulty") {
      const value = String(item.value);
      if (!(["easy", "medium", "hard"] as const).includes(value as "easy" | "medium" | "hard")) {
        throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      }
      conditions.push(item.condition === "EQUAL" ? eq(questions.difficulty, value) : sql`${questions.difficulty} <> ${value}`);
      continue;
    }
    if (item.name === "isPublished") {
      if (typeof item.value !== "boolean") throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      conditions.push(eq(questions.isPublished, item.value));
      continue;
    }
    if (item.name === "status") {
      const value = String(item.value);
      if (!(["todo", "attempted", "accepted"] as const).includes(value as "todo" | "attempted" | "accepted")) {
        throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      }
      const statusSql = value === "todo"
        ? sql`${progress.attempts} = 0`
        : value === "accepted"
          ? sql`coalesce(${progress.bestScore}, 0) >= ${questions.totalScore}`
          : sql`${progress.attempts} > 0 and coalesce(${progress.bestScore}, 0) < ${questions.totalScore}`;
      conditions.push(item.condition === "EQUAL" ? statusSql : sql`not (${statusSql})`);
    }
  }
  if (search.searchTerm) {
    const terms = search.searchTerm.names.map((name) => textCondition(
      name === "title" ? questions.title : questions.slug,
      "CONTAINS",
      search.searchTerm!.value,
    ));
    conditions.push(or(...terms)!);
  }
  return and(...conditions);
}

async function queryWorkspaceQuestionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  includeDrafts: boolean;
  search: ParsedCollectionSearch;
}) {
  const db = getDb();
  const filters = JSON.stringify({ drafts: input.includeDrafts, search: input.search.filters });
  const cursorWhere = parseQuestionCursor(input.search.cursor, input.workspaceId, filters);
  const personalProgress = personalQuestionProgress(input.actor.userId);
  const searchWhere = questionSearchWhere(input.search, personalProgress);
  const rows = await db.select({
    id: questions.id,
    title: questions.title,
    slug: questions.slug,
    difficulty: questions.difficulty,
    totalScore: questions.totalScore,
    isPublished: questions.isPublished,
    createdAt: questions.createdAt,
    cursorCreatedAt: sql<string>`${questions.createdAt}::text`,
    ...personalProgress,
  }).from(questions)
    .where(and(
      eq(questions.workspaceId, input.workspaceId),
      input.includeDrafts ? undefined : eq(questions.isPublished, true),
      searchWhere,
      cursorWhere,
    ))
    .orderBy(desc(questions.createdAt), desc(questions.id))
    .limit(input.search.limit + 1);

  const hasMore = rows.length > input.search.limit;
  const pageRows = rows.slice(0, input.search.limit);
  const items = pageRows.map((row) => {
    const best = Number(row.bestScore ?? 0);
    const total = Number(row.totalScore);
    const attempts = row.attempts ?? 0;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      difficulty: row.difficulty,
      totalScore: row.totalScore,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      bestScore: row.bestScore,
      attempts,
      status: attempts === 0 ? "todo" as const : best >= total ? "accepted" as const : "attempted" as const,
    };
  });
  const last = pageRows.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({
      endpoint: "workspace-questions",
      scope: input.workspaceId,
      filters,
      keys: [last.cursorCreatedAt, last.id],
    }) : null,
  };
}

export async function listWorkspaceQuestionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  limit: number;
  cursor: string | null;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const search = parseCollectionSearch({ limit: input.limit, cursor: input.cursor }, workspaceQuestionSearchConfig);
  return queryWorkspaceQuestionsPage({ ...input, includeDrafts: access.staff, search });
}

export async function searchWorkspaceQuestionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  body: unknown;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const search = parseCollectionSearch(input.body, workspaceQuestionSearchConfig);
  return queryWorkspaceQuestionsPage({ ...input, includeDrafts: access.staff, search });
}

export async function getWorkspaceQuestionBySlug(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  slug: string;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: and(
      eq(questions.workspaceId, input.workspaceId),
      eq(questions.slug, input.slug),
      access.staff ? undefined : eq(questions.isPublished, true),
    ),
    with: {
      testcases: {
        where: access.staff ? undefined : eq(testcases.isSample, true),
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

export async function getWorkspaceQuestionById(actor: WorkspaceActor, workspaceId: string, questionId: string) {
  const access = await requireWorkspaceMember(actor, workspaceId);
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: and(
      eq(questions.workspaceId, workspaceId),
      eq(questions.id, questionId),
      access.staff ? undefined : eq(questions.isPublished, true),
    ),
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

export async function listWorkspaceTestcases(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  limit: number;
  cursor: string | null;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const question = await getWorkspaceQuestionById(input.actor, input.workspaceId, input.questionId);
  if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
  const includeHidden = access.staff;
  const db = getDb();
  const endpoint = "workspace-testcases";
  const scope = `${input.workspaceId}:${input.questionId}`;
  const filters = `hidden=${includeHidden}`;
  let after: ReturnType<typeof or> | undefined;
  if (input.cursor) {
    try {
      const decoded = decodeCursor(input.cursor, { endpoint, scope, filters });
      const [sortOrder, createdAtValue, id] = decoded.keys;
      if (typeof sortOrder !== "number" || typeof createdAtValue !== "string" || typeof id !== "string") throw new Error();
      if (createdAtValue.length > 64 || Number.isNaN(new Date(createdAtValue).getTime())) throw new Error();
      after = or(
        gt(testcases.sortOrder, sortOrder),
        and(eq(testcases.sortOrder, sortOrder), sql`${testcases.createdAt} > ${createdAtValue}::timestamp`),
        and(
          eq(testcases.sortOrder, sortOrder),
          sql`${testcases.createdAt} = ${createdAtValue}::timestamp`,
          gt(testcases.id, id),
        ),
      );
    } catch {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
  }
  const rows = await db.select({
    id: testcases.id,
    name: testcases.name,
    input: testcases.input,
    expectedOutput: testcases.expectedOutput,
    isSample: testcases.isSample,
    isHidden: testcases.isHidden,
    checkerType: testcases.checkerType,
    floatTolerance: testcases.floatTolerance,
    sortOrder: testcases.sortOrder,
    createdAt: testcases.createdAt,
    cursorCreatedAt: sql<string>`${testcases.createdAt}::text`,
  }).from(testcases).where(and(
      eq(testcases.questionId, input.questionId),
      includeHidden ? undefined : eq(testcases.isSample, true),
      after,
    )).orderBy(testcases.sortOrder, testcases.createdAt, testcases.id).limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const pageRows = rows.slice(0, input.limit);
  const items = pageRows.map((row) => ({
    id: row.id,
    name: row.name,
    input: row.input,
    expectedOutput: row.expectedOutput,
    isSample: row.isSample,
    isHidden: row.isHidden,
    checkerType: row.checkerType,
    floatTolerance: row.floatTolerance,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }));
  const last = pageRows.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({
      endpoint,
      scope,
      filters,
      keys: [last.sortOrder, last.cursorCreatedAt, last.id],
    }) : null,
  };
}
