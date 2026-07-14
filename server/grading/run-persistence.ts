import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { gradingJobs, rejudgeJobs, submissionRuns, submissions, testcaseResults } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { deriveRejudgeParentStatus } from "@/server/grading/effective-score";
import { calculateScore } from "@/server/grading/score";
import type { gradeCode } from "@/server/grading/service";
import { recomputeQuestionScore } from "@/server/grading/score-persistence";

export type GradingResult = Awaited<ReturnType<typeof gradeCode>>["results"][number];

function deriveRunStatus(results: GradingResult[]) {
  if (results.some((item) => item.infrastructureFailure)) return "internal_error";
  if (results.some((item) => item.status === "compile_error")) return "compile_error";
  if (results.some((item) => item.status === "memory_limit_exceeded")) return "memory_limit_exceeded";
  if (results.some((item) => item.status === "runtime_error")) return "runtime_error";
  if (results.some((item) => item.status === "time_limit_exceeded")) return "time_limit_exceeded";
  if (results.some((item) => !item.passed)) return "wrong_answer";
  return "accepted";
}

export async function persistRunResult(input: {
  jobId: string;
  workerId: string;
  runId: string;
  submissionId: string;
  results: GradingResult[];
  totalScore: number;
  infrastructureFailure: boolean;
  runError: string | null;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const job = await tx.query.gradingJobs.findFirst({
      where: and(
        eq(gradingJobs.id, input.jobId),
        eq(gradingJobs.status, "running"),
        eq(gradingJobs.lockedBy, input.workerId),
      ),
      with: { submission: true },
    });
    if (!job) throw new AppError(Messages.requestConflict, 409, ErrorCode.CONFLICT);

    await tx.delete(testcaseResults).where(eq(testcaseResults.submissionRunId, input.runId));
    if (input.results.length > 0) {
      await tx.insert(testcaseResults).values(input.results.map((item, index) => ({
        submissionRunId: input.runId,
        testcaseId: item.testcaseId,
        testcaseName: item.name,
        testcaseSortOrder: index,
        isHidden: item.isHidden,
        status: item.status,
        actualOutput: item.actualOutput,
        expectedOutput: item.expectedOutput,
        errorMessage: item.errorMessage,
        runtimeMs: item.runtimeMs,
        memoryKb: item.memoryKb,
        passed: item.passed,
      })));
    }

    const passedCount = input.results.filter((item) => item.passed).length;
    const totalCount = input.results.length;
    const score = calculateScore(input.totalScore, passedCount, totalCount);
    const status = input.infrastructureFailure ? "internal_error" : deriveRunStatus(input.results);
    const runtimeMs = input.results.reduce((max, item) => Math.max(max, item.runtimeMs ?? 0), 0);
    const errorMessage = input.runError ?? input.results.find((item) => item.errorMessage)?.errorMessage ?? null;

    await tx.update(submissionRuns).set({
      status,
      passedCount,
      totalCount,
      score: score.toFixed(2),
      runtimeMs,
      memoryKb: null,
      errorMessage,
      completedAt: new Date(),
    }).where(eq(submissionRuns.id, input.runId));

    const submission = job.submission;
    if (!input.infrastructureFailure) {
      const currentScored = submission.latestScoredRunId
        ? await tx.query.submissionRuns.findFirst({
            where: eq(submissionRuns.id, submission.latestScoredRunId),
            columns: { sequence: true },
          })
        : null;
      const completed = await tx.query.submissionRuns.findFirst({
        where: eq(submissionRuns.id, input.runId),
        columns: { sequence: true },
      });
      if (completed && (!currentScored || completed.sequence > currentScored.sequence)) {
        await tx.update(submissions).set({ latestScoredRunId: input.runId }).where(eq(submissions.id, input.submissionId));
      }
    }

    if (submission.latestRunId === input.runId) {
      await tx.update(submissions).set({
        status,
        passedCount: input.infrastructureFailure ? submission.passedCount : passedCount,
        totalCount: input.infrastructureFailure ? submission.totalCount : totalCount,
        score: input.infrastructureFailure ? submission.score : score.toFixed(2),
        runtimeMs,
        errorMessage,
      }).where(eq(submissions.id, input.submissionId));
    }

    if (submission.isRanked) {
      await recomputeQuestionScore(tx, submission.userId, submission.questionId);
    }

    await tx.update(gradingJobs).set({
      status: input.infrastructureFailure ? "failed" : "completed",
      lockedBy: null,
      leaseExpiresAt: null,
      completedAt: new Date(),
      errorMessage: input.infrastructureFailure ? errorMessage : null,
    }).where(and(eq(gradingJobs.id, input.jobId), eq(gradingJobs.lockedBy, input.workerId)));

    if (job.rejudgeJobId) {
      await tx.update(rejudgeJobs).set({
        completedCount: sql`${rejudgeJobs.completedCount} + 1`,
        failedCount: sql`${rejudgeJobs.failedCount} + ${input.infrastructureFailure ? 1 : 0}`,
      }).where(eq(rejudgeJobs.id, job.rejudgeJobId));
      const parent = await tx.query.rejudgeJobs.findFirst({ where: eq(rejudgeJobs.id, job.rejudgeJobId) });
      if (parent) {
        const parentStatus = deriveRejudgeParentStatus(parent.totalCount, parent.completedCount, parent.failedCount);
        await tx.update(rejudgeJobs).set({
          status: parentStatus,
          completedAt: parentStatus === "completed" || parentStatus === "failed" ? new Date() : null,
        }).where(eq(rejudgeJobs.id, parent.id));
      }
    }
  });
}
