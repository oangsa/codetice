import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { questionScores, questions, submissions, testcases } from "@/db/schema";
import { getDb } from "@/lib/db";
import { calculateScore } from "@/lib/grader/score";
import type { SessionUser } from "@/lib/types";

export async function listQuestionsForUser(user?: SessionUser | null) {
  const db = getDb();
  const publishedFilter = user?.role === "admin" ? undefined : eq(questions.isPublished, true);

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
      user
        ? and(eq(questionScores.questionId, questions.id), eq(questionScores.userId, user.userId))
        : sql`false`,
    )
    .where(publishedFilter)
    .orderBy(desc(questions.createdAt));

  return results;
}

export async function listAdminQuestions() {
  return listQuestionsForUser({ userId: "admin", username: "admin", role: "admin" });
}

export async function getQuestionBySlug(slug: string, user?: SessionUser | null) {
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

  return question ?? null;
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

  return question ?? null;
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

export async function getQuestionStats(userId: string) {
  const db = getDb();
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
}

export function computeQuestionProgress(bestScore: string, totalScore: string) {
  const best = Number(bestScore);
  const total = Number(totalScore);
  return total <= 0 ? 0 : Math.round((best / total) * 100);
}

export function deriveMaxScorePreview(totalScore: string, testcaseCount: number, passedCount: number) {
  return calculateScore(Number(totalScore), passedCount, testcaseCount);
}
