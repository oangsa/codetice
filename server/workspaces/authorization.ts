import "server-only";

import { and, eq } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import {
  resolveWorkspaceAccess,
  type WorkspaceAccess,
  type WorkspaceRole,
  type PlatformRole,
} from "@/modules/workspaces/access";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";

export type WorkspaceActor = {
  userId: string;
  role: PlatformRole;
};

export type AuthorizedWorkspace = WorkspaceAccess & {
  workspaceId: string;
  workspaceRole: WorkspaceRole | null;
};

export async function getWorkspaceAccess(
  actor: WorkspaceActor,
  workspaceId: string,
): Promise<AuthorizedWorkspace | null> {
  const db = getDb();
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { id: true, ownerId: true },
  });
  if (!workspace) {
    return null;
  }

  const membership = actor.role === "admin"
    ? null
    : await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, actor.userId),
        ),
        columns: { role: true },
      });
  const workspaceRole = membership?.role === "ta" || membership?.role === "student"
    ? membership.role
    : null;

  return {
    workspaceId,
    workspaceRole,
    ...resolveWorkspaceAccess(actor.role, workspaceRole, workspace.ownerId === actor.userId),
  };
}

export async function requireWorkspaceMember(actor: WorkspaceActor, workspaceId: string) {
  const access = await getWorkspaceAccess(actor, workspaceId);
  if (!access?.member) {
    throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);
  }
  return access;
}

export async function requireWorkspaceStaff(actor: WorkspaceActor, workspaceId: string) {
  const access = await getWorkspaceAccess(actor, workspaceId);
  if (!access?.member) {
    throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);
  }
  if (!access.staff) {
    throw new AppError(Messages.forbidden, 403, ErrorCode.FORBIDDEN);
  }
  return access;
}

export async function requireWorkspaceAdmin(actor: WorkspaceActor, workspaceId: string) {
  const access = await getWorkspaceAccess(actor, workspaceId);
  if (!access?.member) {
    throw new AppError(Messages.workspaceNotFound, 404, ErrorCode.NOT_FOUND);
  }
  if (!access.admin) {
    throw new AppError(Messages.forbidden, 403, ErrorCode.FORBIDDEN);
  }
  return access;
}
