import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildSessionCookie, decryptSession, encryptSession, type SessionPayload } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";
import { getSessionUserById } from "@/server/services/auth-service";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "admin") {
    redirect("/classrooms");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
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

export async function createUserSession(payload: SessionPayload) {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(buildSessionCookie(token));
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
