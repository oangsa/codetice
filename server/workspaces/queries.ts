import "server-only";

import { and, desc, eq, ilike, lt, ne, or, sql, type SQL } from "drizzle-orm";

import { workspaceMembers, workspaces, users } from "@/db/schema";
import { decodeCursor, encodeCursor, type CursorPage } from "@/lib/cursor";
import {
  escapeLikePattern,
  parseCollectionSearch,
  type ParsedCollectionSearch,
} from "@/lib/collection-search";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { workspaceListStatistics } from "@/server/workspaces/list-statistics";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember, requireWorkspaceStaff } from "@/server/workspaces/authorization";

function cursorCondition(cursor: string | null, endpoint: string, scope: string, filters: string) {
  if (!cursor) return undefined;

  try {
    const decoded = decodeCursor(cursor, { endpoint, scope, filters });
    const [createdAtValue, id] = decoded.keys;
    if (typeof createdAtValue !== "string" || typeof id !== "string") {
      throw new Error("Invalid cursor.");
    }
    if (createdAtValue.length > 64 || Number.isNaN(new Date(createdAtValue).getTime())) {
      throw new Error("Invalid cursor.");
    }
    return or(
      sql`${workspaces.createdAt} < ${createdAtValue}::timestamp`,
      and(sql`${workspaces.createdAt} = ${createdAtValue}::timestamp`, lt(workspaces.id, id)),
    );
  } catch {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
}

export const workspaceSearchConfig = {
  fields: { name: ["CONTAINS", "STARTWITH", "EQUAL"] as const },
  searchTermFields: ["name"] as const,
};

function workspaceSearchWhere(search: ParsedCollectionSearch) {
  const conditions: SQL[] = [];
  for (const item of search.search) {
    const value = String(item.value);
    if (item.condition === "CONTAINS") conditions.push(ilike(workspaces.name, `%${escapeLikePattern(value)}%`));
    if (item.condition === "STARTWITH") conditions.push(ilike(workspaces.name, `${escapeLikePattern(value)}%`));
    if (item.condition === "EQUAL") conditions.push(eq(workspaces.name, value));
  }
  if (search.searchTerm) {
    conditions.push(ilike(workspaces.name, `%${escapeLikePattern(search.searchTerm.value)}%`));
  }
  return and(...conditions);
}

async function queryWorkspacesPage(input: {
  actor: WorkspaceActor;
  search: ParsedCollectionSearch;
}): Promise<CursorPage<{
  id: string;
  name: string;
  createdAt: Date;
  membershipRole: "student" | "ta" | "admin";
  memberCount: number;
  creatorName: string;
  questionCount: number;
  solvedCount: number;
  progressPercent: number;
}>> {
  const db = getDb();
  const endpoint = "workspaces";
  const scope = `${input.actor.userId}:${input.actor.role}`;
  const cursorWhere = cursorCondition(input.search.cursor, endpoint, scope, input.search.filters);
  const searchWhere = workspaceSearchWhere(input.search);
  const { memberCount, creatorName, questionCount, solvedCount } = workspaceListStatistics(input.actor.userId);

  const rows = input.actor.role === "admin"
    ? await db.select({
        id: workspaces.id,
        name: workspaces.name,
        createdAt: workspaces.createdAt,
        cursorCreatedAt: sql<string>`${workspaces.createdAt}::text`,
        memberCount,
        creatorName,
        questionCount,
        solvedCount,
      }).from(workspaces)
        .where(and(searchWhere, cursorWhere))
        .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
        .limit(input.search.limit + 1)
    : await db.select({
        id: workspaces.id,
        name: workspaces.name,
        createdAt: workspaces.createdAt,
        cursorCreatedAt: sql<string>`${workspaces.createdAt}::text`,
        memberCount,
        creatorName,
        questionCount,
        solvedCount,
        role: workspaceMembers.role,
      }).from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaceMembers.userId, input.actor.userId), searchWhere, cursorWhere))
        .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
        .limit(input.search.limit + 1);

  const hasMore = rows.length > input.search.limit;
  const pageRows = rows.slice(0, input.search.limit);
  const items = pageRows.map((row) => {
    const total = Number(row.questionCount);
    const solved = Number(row.solvedCount);
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      memberCount: Number(row.memberCount),
      creatorName: row.creatorName,
      questionCount: total,
      solvedCount: solved,
      progressPercent: total > 0 ? Math.round((solved / total) * 100) : 0,
      membershipRole: input.actor.role === "admin"
        ? "admin" as const
        : (("role" in row && row.role === "ta") ? "ta" as const : "student" as const),
    };
  });
  const last = pageRows.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last
      ? encodeCursor({ endpoint, scope, filters: input.search.filters, keys: [last.cursorCreatedAt, last.id] })
      : null,
  };
}

export function searchWorkspacesPage(input: { actor: WorkspaceActor; search: ParsedCollectionSearch }) {
  return queryWorkspacesPage(input);
}

export async function listWorkspacesPage(input: {
  actor: WorkspaceActor;
  limit: number;
  cursor: string | null;
  search: string;
}): Promise<CursorPage<{
  id: string;
  name: string;
  createdAt: Date;
  membershipRole: "student" | "ta" | "admin";
  memberCount: number;
  creatorName: string;
  questionCount: number;
  solvedCount: number;
  progressPercent: number;
}>> {
  const search = parseCollectionSearch({
    limit: input.limit,
    cursor: input.cursor,
    searchTerm: input.search.trim() ? { name: "name", value: input.search } : undefined,
  }, workspaceSearchConfig);
  return queryWorkspacesPage({ actor: input.actor, search });
}

export async function getWorkspaceDetail(actor: WorkspaceActor, workspaceId: string) {
  const access = await requireWorkspaceMember(actor, workspaceId);
  const db = getDb();
  const statistics = workspaceListStatistics(actor.userId);
  const [row] = await db.select({
    id: workspaces.id,
    name: workspaces.name,
    inviteCode: workspaces.inviteCode,
    createdAt: workspaces.createdAt,
    memberCount: sql<number>`count(${workspaceMembers.id})::int`,
    questionCount: statistics.questionCount,
    solvedCount: statistics.solvedCount,
  }).from(workspaces)
    .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaces.id, workspaceId))
    .groupBy(workspaces.id);

  if (!row) throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);

  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    memberCount: Number(row.memberCount),
    questionCount: Number(row.questionCount),
    solvedCount: Number(row.solvedCount),
    role: access.admin ? "admin" as const : access.workspaceRole,
    canManageContent: access.staff,
    inviteCode: access.admin ? row.inviteCode : null,
  };
}

export const workspaceMemberSearchConfig = {
  fields: {
    username: ["CONTAINS", "STARTWITH", "EQUAL"] as const,
    role: ["EQUAL", "NOTEQUAL"] as const,
  },
  searchTermFields: ["username"] as const,
};

function workspaceMemberSearchWhere(search: ParsedCollectionSearch) {
  const conditions: SQL[] = [ne(users.role, "admin")];
  for (const item of search.search) {
    const value = String(item.value);
    if (item.name === "username") {
      if (item.condition === "CONTAINS") conditions.push(ilike(users.username, `%${escapeLikePattern(value)}%`));
      if (item.condition === "STARTWITH") conditions.push(ilike(users.username, `${escapeLikePattern(value)}%`));
      if (item.condition === "EQUAL") conditions.push(eq(users.username, value));
      continue;
    }
    if (!(["student", "ta"] as const).includes(value as "student" | "ta")) {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
    conditions.push(item.condition === "EQUAL" ? eq(workspaceMembers.role, value) : ne(workspaceMembers.role, value));
  }
  if (search.searchTerm) {
    conditions.push(ilike(users.username, `%${escapeLikePattern(search.searchTerm.value)}%`));
  }
  return and(...conditions);
}

async function queryWorkspaceMembersPage(input: {
  workspaceId: string;
  search: ParsedCollectionSearch;
}) {
  const db = getDb();
  const endpoint = "workspace-members";
  const scope = input.workspaceId;
  const filters = input.search.filters;
  let after: ReturnType<typeof or> | undefined;
  if (input.search.cursor) {
    try {
      const decoded = decodeCursor(input.search.cursor, { endpoint, scope, filters });
      const [joinedAtValue, id] = decoded.keys;
      if (typeof joinedAtValue !== "string" || typeof id !== "string") throw new Error();
      if (joinedAtValue.length > 64 || Number.isNaN(new Date(joinedAtValue).getTime())) throw new Error();
      after = or(
        sql`${workspaceMembers.joinedAt} < ${joinedAtValue}::timestamp`,
        and(sql`${workspaceMembers.joinedAt} = ${joinedAtValue}::timestamp`, lt(workspaceMembers.id, id)),
      );
    } catch {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
  }

  const rows = await db.select({
    id: workspaceMembers.id,
    userId: users.id,
    username: users.username,
    platformRole: users.role,
    role: workspaceMembers.role,
    joinedAt: workspaceMembers.joinedAt,
    cursorJoinedAt: sql<string>`${workspaceMembers.joinedAt}::text`,
  }).from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, input.workspaceId), workspaceMemberSearchWhere(input.search), after))
    .orderBy(desc(workspaceMembers.joinedAt), desc(workspaceMembers.id))
    .limit(input.search.limit + 1);
  const hasMore = rows.length > input.search.limit;
  const pageRows = rows.slice(0, input.search.limit);
  const items = pageRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    username: row.username,
    platformRole: row.platformRole === "admin" ? "admin" as const : "student" as const,
    role: row.role === "ta" ? "ta" as const : "student" as const,
    joinedAt: row.joinedAt,
  }));
  const last = pageRows.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last
      ? encodeCursor({ endpoint, scope, filters, keys: [last.cursorJoinedAt, last.id] })
      : null,
  };
}

export async function listWorkspaceMembersPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  limit: number;
  cursor: string | null;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const search = parseCollectionSearch({ limit: input.limit, cursor: input.cursor }, workspaceMemberSearchConfig);
  return queryWorkspaceMembersPage({ workspaceId: input.workspaceId, search });
}

export async function searchWorkspaceMembersPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  body: unknown;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const search = parseCollectionSearch(input.body, workspaceMemberSearchConfig);
  return queryWorkspaceMembersPage({ workspaceId: input.workspaceId, search });
}

export async function getWorkspaceMembership(actor: WorkspaceActor, workspaceId: string) {
  await requireWorkspaceMember(actor, workspaceId);
  if (actor.role === "admin") return null;
  return getDb().query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, actor.userId)),
    columns: { joinedAt: true },
  });
}
