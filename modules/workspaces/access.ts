export type PlatformRole = "student" | "admin";
export type WorkspaceRole = "student" | "ta";

export type WorkspaceAccess = {
  member: boolean;
  staff: boolean;
  admin: boolean;
  owner: boolean;
};

export function resolveWorkspaceAccess(
  platformRole: PlatformRole,
  workspaceRole: WorkspaceRole | null,
  isOwner = false,
): WorkspaceAccess {
  const owner = isOwner;
  const admin = platformRole === "admin" || owner;
  const member = admin || workspaceRole === "student" || workspaceRole === "ta";
  const staff = admin || workspaceRole === "ta";

  return { member, staff, admin, owner };
}
