import "server-only";

import { and, asc, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { questionTags, questions, tags, testcases } from "@/db/schema";
import { escapeLikePattern, parseCollectionSearch, type ParsedCollectionSearch } from "@/lib/collection-search";
import { getDb } from "@/lib/db";
import { createPagedResult, pageOffset } from "@/lib/pagination";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { parseQuestionTagIds } from "@/lib/question-tag-filters";
import { personalQuestionProgress } from "@/server/questions/personal-progress";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceAdmin, requireWorkspaceMember } from "@/server/workspaces/authorization";

function parseQuestionJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
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

export function parseWorkspaceQuestionTagIds(tagIds: string[]) {
  return parseQuestionTagIds(tagIds);
}

function parseWorkspaceQuestionSearch(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  const { tagIds, ...collectionBody } = body as Record<string, unknown>;
  return {
    search: parseCollectionSearch(collectionBody, workspaceQuestionSearchConfig),
    tagIds: parseQuestionTagIds(tagIds),
  };
}

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
  tagIds: string[];
}) {
  const db = getDb();
  const personalProgress = personalQuestionProgress(input.actor.userId);
  const searchWhere = questionSearchWhere(input.search, personalProgress);
  const tagWhere = input.tagIds.length > 0
    ? exists(
        db.select({ questionId: questionTags.questionId })
          .from(questionTags)
          .where(and(
            eq(questionTags.questionId, questions.id),
            inArray(questionTags.tagId, input.tagIds),
          )),
      )
    : undefined;
  const where = and(
      eq(questions.workspaceId, input.workspaceId),
      input.includeDrafts ? undefined : eq(questions.isPublished, true),
      searchWhere,
      tagWhere,
    );
  const [rows, countRows] = await Promise.all([
    db.select({
      id: questions.id,
      title: questions.title,
      slug: questions.slug,
      difficulty: questions.difficulty,
      totalScore: questions.totalScore,
      isPublished: questions.isPublished,
      createdAt: questions.createdAt,
      ...personalProgress,
    }).from(questions)
      .where(where)
      .orderBy(desc(questions.createdAt), desc(questions.id))
      .limit(input.search.pageSize)
      .offset(pageOffset(input.search)),
    db.select({ count: sql<number>`count(*)::int` }).from(questions).where(where),
  ]);
  const tagRows = rows.length === 0 ? [] : await db.select({
    questionId: questionTags.questionId,
    id: tags.id,
    name: tags.name,
    slug: tags.slug,
    isPreset: tags.isPreset,
  }).from(questionTags)
    .innerJoin(tags, eq(tags.id, questionTags.tagId))
    .where(inArray(questionTags.questionId, rows.map((row) => row.id)))
    .orderBy(asc(tags.name), asc(tags.id));
  const tagsByQuestionId = new Map<string, typeof tagRows>();
  for (const tag of tagRows) {
    const questionTagsForQuestion = tagsByQuestionId.get(tag.questionId) ?? [];
    questionTagsForQuestion.push(tag);
    tagsByQuestionId.set(tag.questionId, questionTagsForQuestion);
  }
  const items = rows.map((row) => {
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
      tags: tagsByQuestionId.get(row.id)?.map(({ id, name, slug, isPreset }) => ({ id, name, slug, isPreset })) ?? [],
    };
  });
  return createPagedResult(items, {
    currentPage: input.search.pageNumber,
    pageSize: input.search.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}

export async function listWorkspaceQuestionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  pageNumber: number;
  pageSize: number;
  tagIds?: string[];
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const search = parseCollectionSearch({ pageNumber: input.pageNumber, pageSize: input.pageSize }, workspaceQuestionSearchConfig);
  return queryWorkspaceQuestionsPage({
    ...input,
    includeDrafts: access.staff,
    search,
    tagIds: parseQuestionTagIds(input.tagIds ?? []),
  });
}

export async function searchWorkspaceQuestionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  body: unknown;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const { search, tagIds } = parseWorkspaceQuestionSearch(input.body);
  return queryWorkspaceQuestionsPage({ ...input, includeDrafts: access.staff, search, tagIds });
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
      questionTags: { with: { tag: true } },
    },
  });
  if (!question) return null;
  return {
    ...question,
    starterCodeByLanguage: parseQuestionJson<Record<string, string>>(question.starterCodeByLanguage, {}),
    allowedLanguages: parseQuestionJson<string[]>(question.allowedLanguages, []),
    tags: question.questionTags.flatMap(({ tag }) => tag ? [{
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isPreset: tag.isPreset,
    }] : []),
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
      questionTags: { with: { tag: true } },
    },
  });
  if (!question) return null;
  return {
    ...question,
    starterCodeByLanguage: parseQuestionJson<Record<string, string>>(question.starterCodeByLanguage, {}),
    allowedLanguages: parseQuestionJson<string[]>(question.allowedLanguages, []),
    tags: question.questionTags.flatMap(({ tag }) => tag ? [{
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isPreset: tag.isPreset,
    }] : []),
  };
}

export async function listWorkspaceCloneQuestionOptions(actor: WorkspaceActor, workspaceId: string) {
  await requireWorkspaceAdmin(actor, workspaceId);
  const rows = await getDb().query.questions.findMany({
    where: eq(questions.workspaceId, workspaceId),
    columns: { id: true, title: true, isPublished: true },
    with: { testcases: { columns: { id: true } } },
    orderBy: (fields, ops) => [ops.asc(fields.title), ops.asc(fields.id)],
  });
  return rows.map((question) => ({
    id: question.id,
    title: question.title,
    isPublished: question.isPublished,
    testcaseCount: question.testcases.length,
  }));
}

export async function listWorkspaceTestcases(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  pageNumber: number;
  pageSize: number;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const question = await getWorkspaceQuestionById(input.actor, input.workspaceId, input.questionId);
  if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
  const includeHidden = access.staff;
  const db = getDb();
  const where = and(
      eq(testcases.questionId, input.questionId),
      includeHidden ? undefined : eq(testcases.isSample, true),
    );
  const [rows, countRows] = await Promise.all([
    db.select({
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
    }).from(testcases)
      .where(where)
      .orderBy(testcases.sortOrder, testcases.createdAt, testcases.id)
      .limit(input.pageSize)
      .offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)::int` }).from(testcases).where(where),
  ]);
  const items = rows.map((row) => ({
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
  return createPagedResult(items, {
    currentPage: input.pageNumber,
    pageSize: input.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}
