import type { AuthSession } from "@/lib/types";

export function validateSessionUser(
  claims: AuthSession,
  databaseUser: AuthSession | null,
): AuthSession | null {
  if (!databaseUser || databaseUser.userId !== claims.userId || databaseUser.tokenVersion !== claims.tokenVersion) {
    return null;
  }
  return {
    userId: databaseUser.userId,
    role: databaseUser.role,
    tokenVersion: databaseUser.tokenVersion,
  };
}
