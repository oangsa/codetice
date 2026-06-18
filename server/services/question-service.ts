import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { leaderboards, questionScores, questions, submissions, testcases } from "@/db/schema";
import { getDb } from "@/lib/db";
import { calculateScore } from "@/lib/grader/score";
import type { AuthSession, SessionUser } from "@/lib/types";

const DEFAULT_QUESTION_SUBMISSIONS_PAGE_SIZE = 20;
const MAX_QUESTION_SUBMISSIONS_PAGE_SIZE = 100;

/** Returns true if the user may create/edit/delete the question and its testcases. */
export function canUserEditQuestion(
  user: AuthSession,
  question: { createdBy: string | null },
): boolean {
  return user.role === "admin" || (!!question.createdBy && question.createdBy === user.userId);
}

export async function listQuestionsForUser(user?: AuthSession | null) {
  const db = getDb();
  const publishedFilter = user?.role === "admin" ? undefined : eq(questions.isPublished, true);
  const includeUserScores = Boolean(user && user.role !== "admin");
  const scoreUserId = includeUserScores ? user!.userId : null;

  const results = await db
    .select({
      id: questions.id,
      title: questions.title,
      slug: questions.slug,
      difficulty: questions.difficulty,
      totalScore: questions.totalScore,
      isPublished: questions.isPublished,
      createdAt: questions.createdAt,
      bestScore: questionScores.bestScore,
      attempts: questionScores.attempts,
    })
    .from(questions)
    .leftJoin(
      questionScores,
      includeUserScores
        ? and(eq(questionScores.questionId, questions.id), eq(questionScores.userId, scoreUserId!))
        : sql`false`,
    )
    .where(publishedFilter)
    .orderBy(desc(questions.createdAt));

  return results;
}

export async function listAdminQuestions() {
  return listQuestionsForUser({ userId: "", role: "admin" });
}

export async function getQuestionBySlug(slug: string, user?: AuthSession | null) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where:
      user?.role === "admin"
        ? eq(questions.slug, slug)
        : and(eq(questions.slug, slug), eq(questions.isPublished, true)),
    with: {
      testcases: {
        orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)],
      },
    },
  });

  return question
    ? {
        ...question,
        starterCodeByLanguage: question.starterCodeByLanguage
          ? (JSON.parse(question.starterCodeByLanguage) as Record<string, string>)
          : {},
        allowedLanguages: question.allowedLanguages
          ? (JSON.parse(question.allowedLanguages) as string[])
          : [],
      }
    : null;
}

export async function getQuestionById(questionId: string) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: eq(questions.id, questionId),
    with: {
      testcases: {
        orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)],
      },
    },
  });

  return question
    ? {
        ...question,
        starterCodeByLanguage: question.starterCodeByLanguage
          ? (JSON.parse(question.starterCodeByLanguage) as Record<string, string>)
          : {},
        allowedLanguages: question.allowedLanguages
          ? (JSON.parse(question.allowedLanguages) as string[])
          : [],
      }
    : null;
}

export async function createQuestion(input: {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  totalScore: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  starterCode?: string | null;
  starterCodeByLanguage?: Record<string, string | null> | null;
  allowedLanguages?: string[] | null;
  isPublished: boolean;
  createdBy: string;
}) {
  const db = getDb();

  const [question] = await db
    .insert(questions)
    .values({
      title: input.title,
      slug: input.slug,
      description: input.description,
      difficulty: input.difficulty,
      totalScore: input.totalScore.toFixed(2),
      timeLimitMs: input.timeLimitMs,
      memoryLimitMb: input.memoryLimitMb,
      starterCode: input.starterCode ?? "",
      starterCodeByLanguage: JSON.stringify(input.starterCodeByLanguage ?? {}),
      allowedLanguages: input.allowedLanguages ? JSON.stringify(input.allowedLanguages) : null,
      isPublished: false,
      createdBy: input.createdBy,
    })
    .returning();

  if (!question) {
    throw new Error("Unable to create question.");
  }

  if (input.isPublished) {
    throw new Error("Add at least one testcase before publishing.");
  }

  return question;
}

export async function updateQuestion(
  questionId: string,
  input: {
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    totalScore: number;
    timeLimitMs: number;
    memoryLimitMb: number;
    starterCode?: string | null;
    starterCodeByLanguage?: Record<string, string | null> | null;
    allowedLanguages?: string[] | null;
    isPublished: boolean;
  },
) {
  const db = getDb();
  const existingTestcases = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testcases)
    .where(eq(testcases.questionId, questionId));

  if (input.isPublished && (existingTestcases[0]?.count ?? 0) === 0) {
    throw new Error("A question must have at least one testcase before publishing.");
  }

  const [question] = await db
    .update(questions)
    .set({
      title: input.title,
      slug: input.slug,
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
    })
    .where(eq(questions.id, questionId))
    .returning();

  if (!question) {
    throw new Error("Question not found.");
  }

  return question;
}

export async function deleteQuestion(questionId: string) {
  const db = getDb();
  await db.delete(questions).where(eq(questions.id, questionId));
}

export async function createTestcase(
  questionId: string,
  input: {
    name?: string | null;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    isHidden: boolean;
    checkerType: string;
    floatTolerance?: number | null;
    sortOrder: number;
  },
) {
  const db = getDb();

  const [testcase] = await db
    .insert(testcases)
    .values({
      questionId,
      name: input.name ?? null,
      input: input.input,
      expectedOutput: input.expectedOutput,
      isSample: input.isSample,
      isHidden: input.isHidden,
      checkerType: input.checkerType,
      floatTolerance: input.floatTolerance?.toString() ?? null,
      sortOrder: input.sortOrder,
    })
    .returning();

  return testcase;
}

export async function updateTestcase(
  testcaseId: string,
  input: {
    name?: string | null;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    isHidden: boolean;
    checkerType: string;
    floatTolerance?: number | null;
    sortOrder: number;
  },
) {
  const db = getDb();
  const [testcase] = await db
    .update(testcases)
    .set({
      name: input.name ?? null,
      input: input.input,
      expectedOutput: input.expectedOutput,
      isSample: input.isSample,
      isHidden: input.isHidden,
      checkerType: input.checkerType,
      floatTolerance: input.floatTolerance?.toString() ?? null,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(testcases.id, testcaseId))
    .returning();

  if (!testcase) {
    throw new Error("Testcase not found.");
  }

  return testcase;
}

export async function deleteTestcase(testcaseId: string) {
  const db = getDb();
  await db.delete(testcases).where(eq(testcases.id, testcaseId));
}

export async function listQuestionSubmissions(questionId: string, userId: string) {
  const db = getDb();
  return db.query.submissions.findMany({
    where: and(eq(submissions.questionId, questionId), eq(submissions.userId, userId)),
    orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
  });
}

export async function listQuestionSubmissionsPage(
  questionId: string,
  userId: string,
  input?: {
    limit?: number;
    offset?: number;
  },
) {
  const db = getDb();
  const limit = Math.min(
    Math.max(input?.limit ?? DEFAULT_QUESTION_SUBMISSIONS_PAGE_SIZE, 1),
    MAX_QUESTION_SUBMISSIONS_PAGE_SIZE,
  );
  const offset = Math.max(input?.offset ?? 0, 0);

  const rows = await db.query.submissions.findMany({
    where: and(eq(submissions.questionId, questionId), eq(submissions.userId, userId)),
    orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
    limit: limit + 1,
    offset,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    submissions: page,
    hasMore,
    nextOffset: hasMore ? offset + page.length : null,
  };
}

export async function getQuestionStats(userId: string) {
  const db = getDb();

  const leaderboard = await db.query.leaderboards.findFirst({
    where: eq(leaderboards.userId, userId),
    columns: {
      totalScore: true,
      solvedCount: true,
    },
  });

  if (leaderboard) {
    return {
      solved: leaderboard.solvedCount,
      totalScore: leaderboard.totalScore,
    };
  }

  try {
    const [summary] = await db
      .select({
        solved: sql<number>`count(*)::int`,
        totalScore: sql<string>`coalesce(sum(${questionScores.bestScore}), 0)::text`,
      })
      .from(questionScores)
      .where(eq(questionScores.userId, userId));

    return {
      solved: summary?.solved ?? 0,
      totalScore: summary?.totalScore ?? "0",
    };
  } catch {
    return {
      solved: 0,
      totalScore: "0",
    };
  }
}

export function computeQuestionProgress(bestScore: string, totalScore: string) {
  const best = Number(bestScore);
  const total = Number(totalScore);
  return total <= 0 ? 0 : Math.round((best / total) * 100);
}

export function deriveMaxScorePreview(totalScore: string, testcaseCount: number, passedCount: number) {
  return calculateScore(Number(totalScore), passedCount, testcaseCount);
}
