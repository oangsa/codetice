import "server-only";

import { and, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";

import { workspaceMembers, workspaces, users } from "@/db/schema";
import {
  escapeLikePattern,
  parseCollectionSearch,
  type ParsedCollectionSearch,
} from "@/lib/collection-search";
import { getDb } from "@/lib/db";
import { createPagedResult, pageOffset } from "@/lib/pagination";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { workspaceListStatistics } from "@/server/workspaces/list-statistics";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceStaff,
} from "@/server/workspaces/authorization";

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
}) {
  const db = getDb();
  const searchWhere = workspaceSearchWhere(input.search);
  const { memberCount, ownerName, questionCount, solvedCount } = workspaceListStatistics(input.actor.userId);

  const [rows, countRows] = input.actor.role === "admin"
    ? await Promise.all([
      db.select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        memberCount,
        ownerName,
        questionCount,
        solvedCount,
      }).from(workspaces)
        .where(searchWhere)
        .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
        .limit(input.search.pageSize)
        .offset(pageOffset(input.search)),
      db.select({ count: sql<number>`count(*)::int` }).from(workspaces).where(searchWhere),
    ])
    : await Promise.all([
      db.select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        memberCount,
        ownerName,
        questionCount,
        solvedCount,
        role: workspaceMembers.role,
      }).from(workspaces)
        .leftJoin(workspaceMembers, and(
          eq(workspaceMembers.workspaceId, workspaces.id),
          eq(workspaceMembers.userId, input.actor.userId),
        ))
        .where(and(or(
          eq(workspaces.ownerId, input.actor.userId),
          eq(workspaceMembers.userId, input.actor.userId),
        ), searchWhere))
        .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
        .limit(input.search.pageSize)
        .offset(pageOffset(input.search)),
      db.select({ count: sql<number>`count(*)::int` }).from(workspaces)
        .leftJoin(workspaceMembers, and(
          eq(workspaceMembers.workspaceId, workspaces.id),
          eq(workspaceMembers.userId, input.actor.userId),
        ))
        .where(and(or(
          eq(workspaces.ownerId, input.actor.userId),
          eq(workspaceMembers.userId, input.actor.userId),
        ), searchWhere)),
    ]);

  const items = rows.map((row) => {
    const total = Number(row.questionCount);
    const solved = Number(row.solvedCount);
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      memberCount: Number(row.memberCount),
      ownerName: row.ownerName,
      questionCount: total,
      solvedCount: solved,
      progressPercent: total > 0 ? Math.round((solved / total) * 100) : 0,
      membershipRole: input.actor.role === "admin" || row.ownerId === input.actor.userId
        ? "admin" as const
        : (("role" in row && row.role === "ta") ? "ta" as const : "student" as const),
    };
  });
  return createPagedResult(items, {
    currentPage: input.search.pageNumber,
    pageSize: input.search.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}

export function searchWorkspacesPage(input: { actor: WorkspaceActor; search: ParsedCollectionSearch }) {
  return queryWorkspacesPage(input);
}

export async function listWorkspacesPage(input: {
  actor: WorkspaceActor;
  pageNumber: number;
  pageSize: number;
  search: string;
}) {
  const search = parseCollectionSearch({
    pageNumber: input.pageNumber,
    pageSize: input.pageSize,
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
    ownerId: workspaces.ownerId,
    ownerName: statistics.ownerName,
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
    owner: { id: row.ownerId, username: row.ownerName },
    createdAt: row.createdAt,
    memberCount: Number(row.memberCount),
    questionCount: Number(row.questionCount),
    solvedCount: Number(row.solvedCount),
    role: access.admin ? "admin" as const : access.workspaceRole,
    canManageContent: access.staff,
    canManageWorkspace: access.admin,
    inviteCode: access.admin ? row.inviteCode : null,
  };
}

export async function listWorkspaceOwnershipCandidates(actor: WorkspaceActor, workspaceId: string) {
  await requireWorkspaceAdmin(actor, workspaceId);
  return getDb().select({ id: users.id, username: users.username }).from(users)
    .where(eq(users.role, "admin"))
    .orderBy(users.username, users.id);
}

export async function listQuestionCloneTargets(actor: WorkspaceActor) {
  const db = getDb();
  const rows = actor.role === "admin"
    ? await db.select({ id: workspaces.id, name: workspaces.name }).from(workspaces)
      .orderBy(workspaces.name, workspaces.id)
    : await db.select({ id: workspaces.id, name: workspaces.name }).from(workspaces)
      .leftJoin(workspaceMembers, and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, actor.userId),
      ))
      .where(or(
        eq(workspaces.ownerId, actor.userId),
        eq(workspaceMembers.role, "ta"),
      ))
      .orderBy(workspaces.name, workspaces.id);
  return rows;
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
  const where = and(eq(workspaceMembers.workspaceId, input.workspaceId), workspaceMemberSearchWhere(input.search));
  const [rows, countRows] = await Promise.all([
    db.select({
      id: workspaceMembers.id,
      userId: users.id,
      username: users.username,
      platformRole: users.role,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    }).from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(where)
      .orderBy(desc(workspaceMembers.joinedAt), desc(workspaceMembers.id))
      .limit(input.search.pageSize)
      .offset(pageOffset(input.search)),
    db.select({ count: sql<number>`count(*)::int` }).from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(where),
  ]);
  const items = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    username: row.username,
    platformRole: row.platformRole === "admin" ? "admin" as const : "student" as const,
    role: row.role === "ta" ? "ta" as const : "student" as const,
    joinedAt: row.joinedAt,
  }));
  return createPagedResult(items, {
    currentPage: input.search.pageNumber,
    pageSize: input.search.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}

export async function listWorkspaceMembersPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  pageNumber: number;
  pageSize: number;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const search = parseCollectionSearch({ pageNumber: input.pageNumber, pageSize: input.pageSize }, workspaceMemberSearchConfig);
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
  const access = await requireWorkspaceMember(actor, workspaceId);
  if (access.admin) return null;
  return getDb().query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, actor.userId)),
    columns: { joinedAt: true },
  });
}
