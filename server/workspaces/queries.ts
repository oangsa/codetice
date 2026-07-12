import "server-only";

import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";

import { workspaceMembers, workspaces, users } from "@/db/schema";
import { decodeCursor, encodeCursor, type CursorPage } from "@/lib/cursor";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { workspaceListStatistics } from "@/server/workspaces/list-statistics";
import type { AuthorizedWorkspace, WorkspaceActor } from "@/server/workspaces/authorization";

function cursorCondition(cursor: string | null, endpoint: string, scope: string, filters: string) {
  if (!cursor) return undefined;

  try {
    const decoded = decodeCursor(cursor, { endpoint, scope, filters });
    const [createdAtValue, id] = decoded.keys;
    if (typeof createdAtValue !== "string" || typeof id !== "string") {
      throw new Error("Invalid cursor.");
    }
    const createdAt = new Date(createdAtValue);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Invalid cursor.");
    }
    return or(
      lt(workspaces.createdAt, createdAt),
      and(eq(workspaces.createdAt, createdAt), lt(workspaces.id, id)),
    );
  } catch {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
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
  const db = getDb();
  const endpoint = "workspaces";
  const scope = input.actor.role === "admin" ? "admin" : input.actor.userId;
  const search = input.search.trim().slice(0, 100);
  const filters = `q=${search}`;
  const cursorWhere = cursorCondition(input.cursor, endpoint, scope, filters);
  const searchWhere = search
    ? ilike(workspaces.name, `%${search.replace(/[\\%_]/g, "\\$&")}%`)
    : undefined;

  const { memberCount, creatorName, questionCount, solvedCount } = workspaceListStatistics(input.actor.userId);

  const rows = input.actor.role === "admin"
    ? await db.select({
        id: workspaces.id,
        name: workspaces.name,
        createdAt: workspaces.createdAt,
        memberCount,
        creatorName,
        questionCount,
        solvedCount,
      }).from(workspaces)
        .where(and(searchWhere, cursorWhere))
        .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
        .limit(input.limit + 1)
    : await db.select({
        id: workspaces.id,
        name: workspaces.name,
        createdAt: workspaces.createdAt,
        memberCount,
        creatorName,
        questionCount,
        solvedCount,
        role: workspaceMembers.role,
      }).from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaceMembers.userId, input.actor.userId), searchWhere, cursorWhere))
        .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
        .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const pageRows = rows.slice(0, input.limit);
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
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last
      ? encodeCursor({ endpoint, scope, filters, keys: [last.createdAt.toISOString(), last.id] })
      : null,
  };
}

export async function getWorkspaceDetail(workspaceId: string, access: AuthorizedWorkspace) {
  const db = getDb();
  const [row] = await db.select({
    id: workspaces.id,
    name: workspaces.name,
    inviteCode: workspaces.inviteCode,
    createdAt: workspaces.createdAt,
    memberCount: sql<number>`count(${workspaceMembers.id})::int`,
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
    role: access.admin ? "admin" as const : access.workspaceRole,
    canManageContent: access.staff,
    inviteCode: access.admin ? row.inviteCode : null,
  };
}

export async function listWorkspaceMembersPage(input: {
  workspaceId: string;
  limit: number;
  cursor: string | null;
}) {
  const db = getDb();
  const endpoint = "workspace-members";
  const scope = input.workspaceId;
  const filters = "";
  let after: ReturnType<typeof or> | undefined;
  if (input.cursor) {
    try {
      const decoded = decodeCursor(input.cursor, { endpoint, scope, filters });
      const [joinedAtValue, id] = decoded.keys;
      if (typeof joinedAtValue !== "string" || typeof id !== "string") throw new Error();
      const joinedAt = new Date(joinedAtValue);
      if (Number.isNaN(joinedAt.getTime())) throw new Error();
      after = or(
        lt(workspaceMembers.joinedAt, joinedAt),
        and(eq(workspaceMembers.joinedAt, joinedAt), lt(workspaceMembers.id, id)),
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
  }).from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, input.workspaceId), after))
    .orderBy(desc(workspaceMembers.joinedAt), desc(workspaceMembers.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((row) => ({
    ...row,
    platformRole: row.platformRole === "admin" ? "admin" as const : "student" as const,
    role: row.role === "ta" ? "ta" as const : "student" as const,
  }));
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last
      ? encodeCursor({ endpoint, scope, filters, keys: [last.joinedAt.toISOString(), last.id] })
      : null,
  };
}
