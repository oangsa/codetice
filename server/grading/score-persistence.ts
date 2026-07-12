import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { questionScores, submissionRuns, submissions } from "@/db/schema";
import { getDb } from "@/lib/db";
import { selectEffectiveQuestionScore } from "@/server/grading/effective-score";

type Db = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function recomputeQuestionScore(tx: Transaction, userId: string, questionId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${questionId}`}, 0))`);
  const effectiveRun = alias(submissionRuns, "effective_score_run");
  const rows = await tx.select({
    submissionId: submissions.id,
    ranked: submissions.isRanked,
    score: effectiveRun.score,
    createdAt: submissions.createdAt,
  }).from(submissions)
    .leftJoin(effectiveRun, eq(effectiveRun.id, submissions.latestScoredRunId))
    .where(and(eq(submissions.userId, userId), eq(submissions.questionId, questionId)));
  const effective = selectEffectiveQuestionScore(rows.map((row) => ({
    ...row,
    score: row.score === null ? null : Number(row.score),
  })));

  if (!effective) {
    await tx.delete(questionScores).where(and(
      eq(questionScores.userId, userId),
      eq(questionScores.questionId, questionId),
    ));
    return;
  }

  await tx.insert(questionScores).values({
    userId,
    questionId,
    bestSubmissionId: effective.bestSubmissionId,
    bestScore: effective.bestScore.toFixed(2),
    attempts: effective.attempts,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [questionScores.userId, questionScores.questionId],
    set: {
      bestSubmissionId: effective.bestSubmissionId,
      bestScore: effective.bestScore.toFixed(2),
      attempts: effective.attempts,
      updatedAt: new Date(),
    },
  });
}
