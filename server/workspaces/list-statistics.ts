import { sql } from "drizzle-orm";

import {
  questions,
  submissionRuns,
  submissions,
  users,
  workspaceMembers,
} from "@/db/schema";

export function workspaceListStatistics(userId: string) {
  const outerWorkspaceId = sql.raw('"workspaces"."id"');
  const outerWorkspaceOwnerId = sql.raw('"workspaces"."owner_id"');

  return {
    memberCount: sql<number>`(
      select count(*)::int from ${workspaceMembers} cm_count
      where cm_count.workspace_id = ${outerWorkspaceId}
    )`,
    ownerName: sql<string>`coalesce((
      select owner.username from ${users} owner where owner.id = ${outerWorkspaceOwnerId}
    ), 'Unknown')`,
    questionCount: sql<number>`(
      select count(*)::int from ${questions} question_count
      where question_count.workspace_id = ${outerWorkspaceId}
        and question_count.is_published = true
    )`,
    solvedCount: sql<number>`(
      select count(*)::int
      from ${questions} solved_question
      where solved_question.workspace_id = ${outerWorkspaceId}
        and solved_question.is_published = true
        and (
          select max(personal_scored_run.score)
          from ${submissions} personal_submission
          inner join ${submissionRuns} personal_scored_run
            on personal_scored_run.id = personal_submission.latest_scored_run_id
          where personal_submission.user_id = ${userId}
            and personal_submission.question_id = solved_question.id
        ) >= solved_question.total_score
    )`,
  };
}
