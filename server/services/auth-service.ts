import "server-only";

import { randomBytes, createHash } from "node:crypto";

import argon2 from "argon2";
import { and, asc, eq, gt, isNull } from "drizzle-orm";

import { passwordResetTokens, users } from "@/db/schema";
import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from "@/lib/constants";
import { getDb } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

function toSessionUser(user: {
  id: string;
  username: string;
  role: string;
}): SessionUser {
  return {
    userId: user.id,
    username: user.username,
    role: user.role as SessionUser["role"],
  };
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerUser(input: { username: string; password: string }) {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.username, input.username),
  });

  if (existing) {
    throw new Error("Username already exists.");
  }

  const passwordHash = await argon2.hash(input.password);

  const [user] = await db
    .insert(users)
    .values({
      username: input.username,
      passwordHash,
      role: "student",
    })
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
    });

  if (!user) {
    throw new Error("Unable to create user.");
  }

  return toSessionUser(user);
}

export async function loginUser(input: { username: string; password: string }) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.username, input.username),
  });

  if (!user) {
    throw new Error("Invalid username or password.");
  }

  const valid = await argon2.verify(user.passwordHash, input.password);

  if (!valid) {
    throw new Error("Invalid username or password.");
  }

  return toSessionUser(user);
}

export async function getUserById(userId: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return user ?? null;
}

export async function listAllUsers() {
  const db = getDb();
  return db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt), asc(users.username));
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const valid = await argon2.verify(user.passwordHash, input.currentPassword);

  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  await updateUserPassword(user.id, input.newPassword);
}

export async function adminResetPassword(input: {
  targetUserId: string;
  newPassword: string;
}) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.targetUserId),
    columns: { id: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  await updateUserPassword(user.id, input.newPassword);
}

export async function createPasswordResetToken(input: { userId: string }) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
    columns: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    token,
    expiresAt,
    user,
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  newPassword: string;
}) {
  const db = getDb();
  const tokenHash = hashResetToken(input.token);
  const now = new Date();

  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now),
    ),
    with: {
      user: {
        columns: {
          id: true,
        },
      },
    },
  });

  if (!resetToken?.user) {
    throw new Error("This reset link is invalid or has expired.");
  }

  await updateUserPassword(resetToken.user.id, input.newPassword);

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));
}

async function updateUserPassword(userId: string, newPassword: string) {
  const db = getDb();
  const passwordHash = await argon2.hash(newPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}
