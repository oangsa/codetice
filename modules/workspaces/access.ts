export type PlatformRole = "student" | "admin";
export type WorkspaceRole = "student" | "ta";

export type WorkspaceAccess = {
  member: boolean;
  staff: boolean;
  admin: boolean;
};

export function resolveWorkspaceAccess(
  platformRole: PlatformRole,
  workspaceRole: WorkspaceRole | null,
): WorkspaceAccess {
  const admin = platformRole === "admin";
  const member = admin || workspaceRole === "student" || workspaceRole === "ta";
  const staff = admin || workspaceRole === "ta";

  return { member, staff, admin };
}
