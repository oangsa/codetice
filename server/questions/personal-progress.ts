import { sql } from "drizzle-orm";

import { questions, submissionRuns, submissions } from "@/db/schema";

/**
 * Personal progress intentionally includes ranked and unranked submissions.
 * Ranking aggregates remain separate in question_scores.
 */
export function personalQuestionProgress(userId: string) {
  return {
    bestScore: sql<string | null>`(
      select max(personal_scored_run.score)
      from ${submissions} personal_submission
      inner join ${submissionRuns} personal_scored_run
        on personal_scored_run.id = personal_submission.latest_scored_run_id
      where personal_submission.user_id = ${userId}
        and personal_submission.question_id = ${questions}.${questions.id}
    )`,
    attempts: sql<number>`(
      select count(*)::int
      from ${submissions} personal_submission
      where personal_submission.user_id = ${userId}
        and personal_submission.question_id = ${questions}.${questions.id}
    )`,
  };
}
