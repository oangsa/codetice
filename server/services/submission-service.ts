import "server-only";

import { and, eq } from "drizzle-orm";

import { questionScores, questions, submissions, testcaseResults } from "@/db/schema";
import { getDb } from "@/lib/db";
import { calculateScore } from "@/lib/grader/score";
import { gradeCode } from "@/server/services/grading-service";

export async function runSampleSubmission(input: {
  questionId: string;
  sourceCode: string;
}) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: eq(questions.id, input.questionId),
    with: {
      testcases: true,
    },
  });

  if (!question) {
    throw new Error("Question not found.");
  }

  const sampleCases = question.testcases
    .filter((testcase) => testcase.isSample)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const results = await gradeCode({
    sourceCode: input.sourceCode,
    testcases: sampleCases.map((testcase) => ({
      id: testcase.id,
      name: testcase.name,
      input: testcase.input,
      expectedOutput: testcase.expectedOutput,
      isHidden: testcase.isHidden,
    })),
    timeLimitMs: question.timeLimitMs,
  });

  return {
    questionId: question.id,
    results: results.map((result) => ({
      ...result,
      expectedOutput: result.expectedOutput,
      actualOutput: result.actualOutput,
    })),
  };
}

export async function submitOfficialSolution(input: {
  userId: string;
  questionId: string;
  sourceCode: string;
  language: "python";
}) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: eq(questions.id, input.questionId),
    with: {
      testcases: {
        orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)],
      },
    },
  });

  if (!question) {
    throw new Error("Question not found.");
  }

  const [submission] = await db
    .insert(submissions)
    .values({
      userId: input.userId,
      questionId: question.id,
      language: input.language,
      sourceCode: input.sourceCode,
      status: "queued",
    })
    .returning();

  if (!submission) {
    throw new Error("Unable to create submission.");
  }

  await db
    .update(submissions)
    .set({
      status: "running",
    })
    .where(eq(submissions.id, submission.id));

  const results = await gradeCode({
    sourceCode: input.sourceCode,
    testcases: question.testcases.map((testcase) => ({
      id: testcase.id,
      name: testcase.name,
      input: testcase.input,
      expectedOutput: testcase.expectedOutput,
      isHidden: testcase.isHidden,
    })),
    timeLimitMs: question.timeLimitMs,
  });

  const passedCount = results.filter((result) => result.passed).length;
  const totalCount = results.length;
  const score = calculateScore(Number(question.totalScore), passedCount, totalCount);

  let finalStatus: string = "accepted";
  if (results.some((result) => result.status === "runtime_error")) {
    finalStatus = "runtime_error";
  } else if (results.some((result) => result.status === "time_limit_exceeded")) {
    finalStatus = "time_limit_exceeded";
  } else if (results.some((result) => !result.passed)) {
    finalStatus = "wrong_answer";
  }

  const maxRuntime = results.reduce((max, item) => Math.max(max, item.runtimeMs ?? 0), 0);
  const firstError = results.find((item) => item.errorMessage)?.errorMessage ?? null;

  await db.insert(testcaseResults).values(
    results.map((result) => ({
      submissionId: submission.id,
      testcaseId: result.testcaseId,
      status: result.status,
      actualOutput: result.actualOutput,
      expectedOutput: result.expectedOutput,
      errorMessage: result.errorMessage,
      runtimeMs: result.runtimeMs,
      memoryKb: result.memoryKb,
      passed: result.passed,
    })),
  );

  const [updatedSubmission] = await db
    .update(submissions)
    .set({
      status: finalStatus,
      passedCount,
      totalCount,
      score: score.toFixed(2),
      runtimeMs: maxRuntime,
      memoryKb: null,
      errorMessage: firstError,
    })
    .where(eq(submissions.id, submission.id))
    .returning();

  const existingScore = await db.query.questionScores.findFirst({
    where: and(eq(questionScores.userId, input.userId), eq(questionScores.questionId, input.questionId)),
  });

  if (!existingScore) {
    await db.insert(questionScores).values({
      userId: input.userId,
      questionId: input.questionId,
      bestSubmissionId: submission.id,
      bestScore: score.toFixed(2),
      attempts: 1,
    });
  } else {
    const bestScore = Number(existingScore.bestScore);
    await db
      .update(questionScores)
      .set({
        bestSubmissionId: score > bestScore ? submission.id : existingScore.bestSubmissionId,
        bestScore: Math.max(score, bestScore).toFixed(2),
        attempts: existingScore.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(questionScores.id, existingScore.id));
  }

  return updatedSubmission;
}

export async function listUserSubmissions(userId: string) {
  const db = getDb();
  return db.query.submissions.findMany({
    where: eq(submissions.userId, userId),
    with: {
      question: true,
    },
    orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
  });
}

export async function getSubmissionDetail(submissionId: string, userId: string, role: "student" | "admin") {
  const db = getDb();
  const submission = await db.query.submissions.findFirst({
    where:
      role === "admin"
        ? eq(submissions.id, submissionId)
        : and(eq(submissions.id, submissionId), eq(submissions.userId, userId)),
    with: {
      question: true,
      testcaseResults: {
        with: {
          testcase: true,
        },
      },
      user: {
        columns: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  if (!submission) {
    return null;
  }

  return {
    ...submission,
    testcaseResults: submission.testcaseResults
      .sort((a, b) => a.testcase.sortOrder - b.testcase.sortOrder)
      .map((result) => ({
        ...result,
        expectedOutput:
          role === "admin" || !result.testcase.isHidden ? result.expectedOutput : null,
        actualOutput: role === "admin" || !result.testcase.isHidden ? result.actualOutput : null,
      })),
  };
}

export async function listRecentSubmissionsForAdmin() {
  const db = getDb();
  return db.query.submissions.findMany({
    with: {
      user: true,
      question: true,
    },
    orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
    limit: 50,
  });
}
