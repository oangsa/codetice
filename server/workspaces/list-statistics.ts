import { sql } from "drizzle-orm";

import {
  questions,
  submissionRuns,
  submissions,
  users,
  workspaceMembers,
  workspaces,
} from "@/db/schema";

export function workspaceListStatistics(userId: string) {
  return {
    memberCount: sql<number>`(
      select count(*)::int from ${workspaceMembers} cm_count
      where cm_count.workspace_id = ${workspaces}.${workspaces.id}
    )`,
    creatorName: sql<string>`coalesce((
      select creator.username from ${users} creator where creator.id = ${workspaces}.${workspaces.createdBy}
    ), 'Unknown')`,
    questionCount: sql<number>`(
      select count(*)::int from ${questions} question_count
      where question_count.workspace_id = ${workspaces}.${workspaces.id}
        and question_count.is_published = true
    )`,
    solvedCount: sql<number>`(
      select count(*)::int
      from ${questions} solved_question
      where solved_question.workspace_id = ${workspaces}.${workspaces.id}
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
