import "server-only";

import { and, eq } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";

function generateInviteCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

export async function createWorkspace(input: { name: string; createdBy: string }) {
  const db = getDb();
  const [workspace] = await db.insert(workspaces).values({
    name: input.name,
    inviteCode: generateInviteCode(),
    createdBy: input.createdBy,
  }).returning();

  if (!workspace) {
    throw new AppError(Messages.unableToCreateWorkspace, 500, ErrorCode.INTERNAL);
  }
  return workspace;
}

export async function joinWorkspace(inviteCode: string, userId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const workspace = await tx.query.workspaces.findFirst({
      where: eq(workspaces.inviteCode, inviteCode),
      columns: { id: true, name: true, createdAt: true },
    });
    if (!workspace) {
      throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "student",
    }).onConflictDoNothing({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
    });
    return workspace;
  });
}

export async function updateWorkspace(workspaceId: string, name: string) {
  const db = getDb();
  const [updated] = await db.update(workspaces).set({ name }).where(eq(workspaces.id, workspaceId)).returning();
  if (!updated) {
    throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);
  }
  return updated;
}

export async function deleteWorkspace(workspaceId: string) {
  const db = getDb();
  const [deleted] = await db.delete(workspaces).where(eq(workspaces.id, workspaceId)).returning({ id: workspaces.id });
  if (!deleted) {
    throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);
  }
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: "student" | "ta",
) {
  const db = getDb();
  const [updated] = await db.update(workspaceMembers).set({ role }).where(and(
    eq(workspaceMembers.workspaceId, workspaceId),
    eq(workspaceMembers.userId, userId),
  )).returning();
  if (!updated) {
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  }
  return updated;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const db = getDb();
  const [deleted] = await db.delete(workspaceMembers).where(and(
    eq(workspaceMembers.workspaceId, workspaceId),
    eq(workspaceMembers.userId, userId),
  )).returning({ id: workspaceMembers.id });
  if (!deleted) {
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  }
}
