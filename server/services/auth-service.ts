import "server-only";

import argon2 from "argon2";
import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
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
