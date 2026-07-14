import "server-only";

import { escapeLikePattern, parseCollectionSearch, type ParsedCollectionSearch } from "@/lib/collection-search";
import { getSqlClient } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { createPagedResult, pageOffset } from "@/lib/pagination";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";

type ScoreboardRow = {
  user_id: string;
  username: string;
  total_score: string;
  solved_count: number;
  rank: number;
};

export const workspaceScoreboardSearchConfig = {
  fields: { username: ["CONTAINS", "STARTWITH", "EQUAL"] as const },
  searchTermFields: ["username"] as const,
};

function scoreboardUsernameFilters(search: ParsedCollectionSearch) {
  const values = { contains: null as string | null, startsWith: null as string | null, equal: null as string | null };
  for (const item of search.search) {
    const key = item.condition === "CONTAINS" ? "contains" : item.condition === "STARTWITH" ? "startsWith" : "equal";
    if (values[key] !== null) throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    values[key] = String(item.value);
  }
  if (search.searchTerm) {
    if (values.contains !== null) throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    values.contains = search.searchTerm.value;
  }
  return {
    contains: values.contains === null ? null : `%${escapeLikePattern(values.contains)}%`,
    startsWith: values.startsWith === null ? null : `${escapeLikePattern(values.startsWith)}%`,
    equal: values.equal,
  };
}

async function queryWorkspaceScoreboardPage(input: {
  workspaceId: string;
  search: ParsedCollectionSearch;
}) {
  const client = getSqlClient();
  const username = scoreboardUsernameFilters(input.search);
  const [rows, countRows] = await Promise.all([
    client<ScoreboardRow[]>`
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
        where (${username.contains}::text is null or username ilike ${username.contains})
          and (${username.startsWith}::text is null or username ilike ${username.startsWith})
          and (${username.equal}::text is null or username = ${username.equal})
        order by total_score desc, solved_count desc, username asc, user_id asc
        limit ${input.search.pageSize}
        offset ${pageOffset(input.search)}
      `,
    client<Array<{ total_count: number | string }>>`
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
      select count(*)::int as total_count
      from totals
      where (${username.contains}::text is null or username ilike ${username.contains})
        and (${username.startsWith}::text is null or username ilike ${username.startsWith})
        and (${username.equal}::text is null or username = ${username.equal})
    `,
  ]);
  const items = rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    totalScore: row.total_score,
    solvedCount: row.solved_count,
    rank: row.rank,
  }));
  return createPagedResult(items, {
    currentPage: input.search.pageNumber,
    pageSize: input.search.pageSize,
    totalCount: Number(countRows[0]?.total_count ?? 0),
  });
}

export async function getWorkspaceScoreboardPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  pageNumber: number;
  pageSize: number;
}) {
  await requireWorkspaceMember(input.actor, input.workspaceId);
  const search = parseCollectionSearch({ pageNumber: input.pageNumber, pageSize: input.pageSize }, workspaceScoreboardSearchConfig);
  return queryWorkspaceScoreboardPage({ workspaceId: input.workspaceId, search });
}

export async function searchWorkspaceScoreboardPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  body: unknown;
}) {
  await requireWorkspaceMember(input.actor, input.workspaceId);
  const search = parseCollectionSearch(input.body, workspaceScoreboardSearchConfig);
  return queryWorkspaceScoreboardPage({ workspaceId: input.workspaceId, search });
}
