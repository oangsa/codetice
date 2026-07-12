import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildSessionCookie, decryptSession, encryptSession, type SessionPayload } from "@/lib/session";
import { LEGACY_SESSION_COOKIES, SESSION_COOKIE } from "@/modules/auth/constants";
import { getSessionUserById } from "@/server/auth/service";
import type { AuthSession } from "@/lib/types";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { validateSessionUser } from "@/server/auth/session-validation";

async function getRawSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value
    ?? LEGACY_SESSION_COOKIES.map((name) => cookieStore.get(name)?.value).find(Boolean);
  return decryptSession(token);
}

export const getValidatedSession = cache(async (): Promise<AuthSession | null> => {
  const session = await getRawSession();
  if (!session) {
    return null;
  }

  const user = await getSessionUserById(session.userId);
  return validateSessionUser(session, user);
});

/** Validated optional session for pages. */
export async function getSession() {
  return getValidatedSession();
}

export async function requirePageUser() {
  const session = await getValidatedSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePageAdmin() {
  const session = await requirePageUser();
  if (session.role !== "admin") {
    redirect("/workspaces");
  }
  return session;
}

export async function requireApiUser() {
  const session = await getValidatedSession();
  if (!session) {
    throw new AppError(Messages.unauthorized, 401, ErrorCode.UNAUTHORIZED);
  }
  return session;
}

export async function requireApiAdmin() {
  const session = await requireApiUser();
  if (session.role !== "admin") {
    throw new AppError(Messages.forbidden, 403, ErrorCode.FORBIDDEN);
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getValidatedSession();
  if (!session) {
    return null;
  }

  return getSessionUserById(session.userId);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

function toSessionPayload(payload: AuthSession): SessionPayload {
  return {
    userId: payload.userId,
    role: payload.role,
    tokenVersion: payload.tokenVersion,
  };
}

export async function createUserSession(payload: AuthSession) {
  const token = await encryptSession(toSessionPayload(payload));
  const cookieStore = await cookies();
  cookieStore.set(buildSessionCookie(token));
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  for (const name of LEGACY_SESSION_COOKIES) {
    cookieStore.delete(name);
  }
}
