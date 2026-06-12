import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";

import {
  assignments,
  gradingJobs,
  questionScores,
  questions,
  rejudgeJobs,
  submissions,
  supportedLanguages,
  testcaseResults,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { calculateScore } from "@/lib/grader/score";
import { gradeCode } from "@/server/services/grading-service";
import { recomputeLeaderboardForUser } from "@/server/services/leaderboard-service";

function deriveSubmissionStatus(
  results: Array<{
    status: string;
    passed: boolean;
  }>,
) {
  if (results.some((result) => result.status === "runtime_error")) {
    return "runtime_error";
  }

  if (results.some((result) => result.status === "time_limit_exceeded")) {
    return "time_limit_exceeded";
  }

  if (results.some((result) => !result.passed)) {
    return "wrong_answer";
  }

  return "accepted";
}

async function applySubmissionResults(submissionId: string, sourceCode: string) {
  const db = getDb();
  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
    with: {
      question: {
        with: {
          testcases: {
            orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)],
          },
        },
      },
      assignment: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const language = await db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.slug, submission.language),
  });

  if (!language || !language.isEnabled) {
    throw new Error("Submission language is not available.");
  }

  const results = await gradeCode({
    language: submission.language,
    fileExtension: language.fileExtension,
    runCommand: language.runCommand,
    dockerImage: language.dockerImage,
    sourceCode,
    testcases: submission.question.testcases.map((testcase) => ({
      id: testcase.id,
      name: testcase.name,
      input: testcase.input,
      expectedOutput: testcase.expectedOutput,
      isHidden: testcase.isHidden,
      checkerType: testcase.checkerType,
      floatTolerance: testcase.floatTolerance,
    })),
    timeLimitMs: submission.question.timeLimitMs,
    memoryLimitMb: submission.question.memoryLimitMb,
  });

  await db.delete(testcaseResults).where(eq(testcaseResults.submissionId, submission.id));
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

  const passedCount = results.filter((result) => result.passed).length;
  const totalCount = results.length;
  const score = calculateScore(Number(submission.question.totalScore), passedCount, totalCount);
  const finalStatus = deriveSubmissionStatus(results);
  const maxRuntime = results.reduce((max, item) => Math.max(max, item.runtimeMs ?? 0), 0);
  const firstError = results.find((item) => item.errorMessage)?.errorMessage ?? null;

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
    where: and(eq(questionScores.userId, submission.userId), eq(questionScores.questionId, submission.questionId)),
  });

  if (!existingScore) {
    await db.insert(questionScores).values({
      userId: submission.userId,
      questionId: submission.questionId,
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

  await recomputeLeaderboardForUser(submission.userId);

  return updatedSubmission;
}

export async function runSampleSubmission(input: {
  questionId: string;
  sourceCode: string;
  language: string;
}) {
  const db = getDb();
  const [question, language] = await Promise.all([
    db.query.questions.findFirst({
      where: eq(questions.id, input.questionId),
      with: {
        testcases: true,
      },
    }),
    db.query.supportedLanguages.findFirst({
      where: eq(supportedLanguages.slug, input.language),
    }),
  ]);

  if (!question) {
    throw new Error("Question not found.");
  }

  if (question.allowedLanguages) {
    const allowed = JSON.parse(question.allowedLanguages) as string[];
    if (allowed.length > 0 && !allowed.includes(input.language)) {
      throw new Error(`Language '${input.language}' is not allowed for this question.`);
    }
  }

  if (!language || !language.isEnabled) {
    throw new Error("Language not supported.");
  }

  const sampleCases = question.testcases
    .filter((testcase) => testcase.isSample)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const results = await gradeCode({
    language: input.language,
    fileExtension: language.fileExtension,
    runCommand: language.runCommand,
    dockerImage: language.dockerImage,
    sourceCode: input.sourceCode,
    testcases: sampleCases.map((testcase) => ({
      id: testcase.id,
      name: testcase.name,
      input: testcase.input,
      expectedOutput: testcase.expectedOutput,
      isHidden: testcase.isHidden,
      checkerType: testcase.checkerType,
      floatTolerance: testcase.floatTolerance,
    })),
    timeLimitMs: question.timeLimitMs,
    memoryLimitMb: question.memoryLimitMb,
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

export async function enqueueOfficialSubmission(input: {
  userId: string;
  questionId: string;
  sourceCode: string;
  language: string;
  assignmentId?: string | null;
}) {
  const db = getDb();
  const [question, language, assignment] = await Promise.all([
    db.query.questions.findFirst({
      where: eq(questions.id, input.questionId),
      with: {
        testcases: {
          columns: {
            id: true,
          },
        },
      },
    }),
    db.query.supportedLanguages.findFirst({
      where: eq(supportedLanguages.slug, input.language),
    }),
    input.assignmentId
      ? db.query.assignments.findFirst({
          where: eq(assignments.id, input.assignmentId),
        })
      : Promise.resolve(null),
  ]);

  if (!question) {
    throw new Error("Question not found.");
  }

  if (question.allowedLanguages) {
    const allowed = JSON.parse(question.allowedLanguages) as string[];
    if (allowed.length > 0 && !allowed.includes(input.language)) {
      throw new Error(`Language '${input.language}' is not allowed for this question.`);
    }
  }

  if (!language || !language.isEnabled) {
    throw new Error("Selected language is not available.");
  }

  const isLate = !!(assignment?.dueAt && new Date(assignment.dueAt) < new Date());

  if (question.testcases.length === 0) {
    throw new Error("Question has no testcases.");
  }

  const [submission] = await db
    .insert(submissions)
    .values({
      userId: input.userId,
      questionId: question.id,
      assignmentId: input.assignmentId ?? null,
      language: input.language,
      sourceCode: input.sourceCode,
      status: "queued",
      isLate,
    })
    .returning();

  if (!submission) {
    throw new Error("Unable to create submission.");
  }

  const [gradingJob] = await db
    .insert(gradingJobs)
    .values({
      submissionId: submission.id,
      status: "queued",
    })
    .returning();

  return {
    submission,
    gradingJob,
  };
}

export async function processGradingJob(jobId: string) {
  const db = getDb();
  const job = await db.query.gradingJobs.findFirst({
    where: eq(gradingJobs.id, jobId),
    with: {
      submission: true,
    },
  });

  if (!job) {
    throw new Error("Grading job not found.");
  }

  if (job.status === "completed") {
    return job;
  }

  await db
    .update(gradingJobs)
    .set({
      status: "running",
      attempts: job.attempts + 1,
      startedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(gradingJobs.id, jobId));

  await db
    .update(submissions)
    .set({
      status: "running",
    })
    .where(eq(submissions.id, job.submissionId));

  try {
    await applySubmissionResults(job.submissionId, job.submission.sourceCode);

    const [updatedJob] = await db
      .update(gradingJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(gradingJobs.id, jobId))
      .returning();

    return updatedJob;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal grading failure.";

    await db
      .update(submissions)
      .set({
        status: "internal_error",
        errorMessage: message,
      })
      .where(eq(submissions.id, job.submissionId));

    const [updatedJob] = await db
      .update(gradingJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: message,
      })
      .where(eq(gradingJobs.id, jobId))
      .returning();

    return updatedJob;
  }
}

export async function processPendingGradingJobs(limit = 10) {
  const db = getDb();
  const pendingJobs = await db.query.gradingJobs.findMany({
    where: or(eq(gradingJobs.status, "queued"), isNull(gradingJobs.startedAt)),
    orderBy: (fields, ops) => [ops.asc(fields.createdAt)],
    limit,
  });

  for (const job of pendingJobs) {
    await processGradingJob(job.id);
  }

  return pendingJobs.length;
}

export async function rejudgeSubmission(submissionId: string, requestedBy: string) {
  const db = getDb();
  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const [job] = await db
    .insert(rejudgeJobs)
    .values({
      questionId: submission.questionId,
      requestedBy,
      status: "queued",
    })
    .returning();

  await db
    .update(submissions)
    .set({
      status: "queued",
      errorMessage: null,
    })
    .where(eq(submissions.id, submissionId));

  const [gradingJob] = await db
    .insert(gradingJobs)
    .values({
      submissionId,
      status: "queued",
    })
    .returning();

  return { rejudgeJob: job, gradingJob };
}

export async function rejudgeQuestion(questionId: string, requestedBy: string) {
  const db = getDb();
  const questionSubmissions = await db.query.submissions.findMany({
    where: eq(submissions.questionId, questionId),
    columns: { id: true },
  });

  const [job] = await db
    .insert(rejudgeJobs)
    .values({
      questionId,
      requestedBy,
      status: "queued",
    })
    .returning();

  if (questionSubmissions.length > 0) {
    await db.insert(gradingJobs).values(
      questionSubmissions.map((submission) => ({
        submissionId: submission.id,
        status: "queued",
      })),
    );

    await db
      .update(submissions)
      .set({
        status: "queued",
        errorMessage: null,
      })
      .where(inArray(submissions.id, questionSubmissions.map((submission) => submission.id)));
  }

  await db
    .update(rejudgeJobs)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(rejudgeJobs.id, job.id));

  return job;
}

export async function listUserSubmissions(userId: string) {
  const db = getDb();
  return db.query.submissions.findMany({
    where: eq(submissions.userId, userId),
    with: {
      question: true,
      assignment: true,
      gradingJobs: {
        orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
        limit: 1,
      },
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
      assignment: true,
      gradingJobs: {
        orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
        limit: 5,
      },
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
      assignment: true,
      gradingJobs: {
        orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
        limit: 1,
      },
    },
    orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
    limit: 50,
  });
}
