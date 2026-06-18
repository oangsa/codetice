import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { SESSION_COOKIE } from "@/lib/constants";

const encoder = new TextEncoder();
const secret = encoder.encode(
  process.env.SESSION_SECRET ?? "dev-session-secret-change-me-immediately",
);

export type SessionPayload = {
  userId: string;
  username: string;
  role: "student" | "admin";
  profilePicture: string;
};

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function decryptSession(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function buildSessionCookie(value: string) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
