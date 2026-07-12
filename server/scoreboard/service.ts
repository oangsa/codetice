import "server-only";

import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { getSqlClient } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";

type ScoreboardRow = {
  user_id: string;
  username: string;
  total_score: string;
  solved_count: number;
  rank: number;
};

export async function getWorkspaceScoreboardPage(input: {
  workspaceId: string;
  limit: number;
  cursor: string | null;
}) {
  const endpoint = "workspace-scoreboard";
  const scope = input.workspaceId;
  const filters = "published=true";
  let cursorValues: [string, number, string, string] | null = null;
  if (input.cursor) {
    try {
      const decoded = decodeCursor(input.cursor, { endpoint, scope, filters });
      const [score, solved, username, userId] = decoded.keys;
      if (typeof score !== "string" || typeof solved !== "number" || typeof username !== "string" || typeof userId !== "string") {
        throw new Error();
      }
      cursorValues = [score, solved, username, userId];
    } catch {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
  }

  const client = getSqlClient();
  const rows = cursorValues
    ? await client<ScoreboardRow[]>`
        with eligible as (
          select cm.user_id, u.username
          from workspace_members cm
          join users u on u.id = cm.user_id
          where cm.workspace_id = ${input.workspaceId}
            and cm.role = 'student'
            and u.role = 'student'
        ), totals as (
          select
            e.user_id,
            e.username,
            coalesce(sum(qs.best_score) filter (where q.is_published), 0)::numeric(10,2) as total_score,
            count(*) filter (where q.is_published and qs.best_score >= q.total_score)::int as solved_count
          from eligible e
          left join question_scores qs on qs.user_id = e.user_id
          left join questions q on q.id = qs.question_id and q.workspace_id = ${input.workspaceId}
          group by e.user_id, e.username
        ), ranked as (
          select *, row_number() over (
            order by total_score desc, solved_count desc, username asc, user_id asc
          )::int as rank
          from totals
        )
        select user_id, username, total_score::text, solved_count, rank
        from ranked
        where total_score < ${cursorValues[0]}::numeric
           or (total_score = ${cursorValues[0]}::numeric and solved_count < ${cursorValues[1]})
           or (total_score = ${cursorValues[0]}::numeric and solved_count = ${cursorValues[1]} and username > ${cursorValues[2]})
           or (total_score = ${cursorValues[0]}::numeric and solved_count = ${cursorValues[1]} and username = ${cursorValues[2]} and user_id > ${cursorValues[3]}::uuid)
        order by total_score desc, solved_count desc, username asc, user_id asc
        limit ${input.limit + 1}
      `
    : await client<ScoreboardRow[]>`
        with eligible as (
          select cm.user_id, u.username
          from workspace_members cm
          join users u on u.id = cm.user_id
          where cm.workspace_id = ${input.workspaceId}
            and cm.role = 'student'
            and u.role = 'student'
        ), totals as (
          select
            e.user_id,
            e.username,
            coalesce(sum(qs.best_score) filter (where q.is_published), 0)::numeric(10,2) as total_score,
            count(*) filter (where q.is_published and qs.best_score >= q.total_score)::int as solved_count
          from eligible e
          left join question_scores qs on qs.user_id = e.user_id
          left join questions q on q.id = qs.question_id and q.workspace_id = ${input.workspaceId}
          group by e.user_id, e.username
        )
        select
          user_id,
          username,
          total_score::text,
          solved_count,
          row_number() over (
            order by total_score desc, solved_count desc, username asc, user_id asc
          )::int as rank
        from totals
        order by total_score desc, solved_count desc, username asc, user_id asc
        limit ${input.limit + 1}
      `;

  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((row) => ({
    userId: row.user_id,
    username: row.username,
    totalScore: row.total_score,
    solvedCount: row.solved_count,
    rank: row.rank,
  }));
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({
      endpoint,
      scope,
      filters,
      keys: [last.totalScore, last.solvedCount, last.username, last.userId],
    }) : null,
  };
}
