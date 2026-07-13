import "server-only";

import { randomBytes, createHash } from "node:crypto";

import argon2 from "argon2";
import { and, desc, eq, gt, gte, ilike, isNull, lte, ne, sql, type SQL } from "drizzle-orm";

import { passwordResetTokens, questions, users, workspaces } from "@/db/schema";
import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from "@/modules/auth/constants";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { escapeLikePattern, parseCollectionSearch, type ParsedCollectionSearch } from "@/lib/collection-search";
import { createPagedResult, pageOffset } from "@/lib/pagination";
import type { SessionUser } from "@/lib/types";

function toSessionUser(user: {
  id: string;
  username: string;
  role: string;
  profilePicture: string;
  tokenVersion: number;
}): SessionUser {
  return {
    userId: user.id,
    username: user.username,
    role: user.role as SessionUser["role"],
    profilePicture: user.profilePicture,
    tokenVersion: user.tokenVersion,
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
    throw new AppError(Messages.usernameTaken, 409, ErrorCode.CONFLICT);
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
      profilePicture: users.profilePicture,
      tokenVersion: users.tokenVersion,
    });

  if (!user) {
    throw new AppError(Messages.unableToSubmit, 500, ErrorCode.INTERNAL);
  }

  return toSessionUser(user);
}

export async function loginUser(input: { username: string; password: string }) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.username, input.username),
  });

  if (!user) {
    throw new AppError(Messages.invalidCredentials, 401, ErrorCode.UNAUTHORIZED);
  }

  const valid = await argon2.verify(user.passwordHash, input.password);

  if (!valid) {
    throw new AppError(Messages.invalidCredentials, 401, ErrorCode.UNAUTHORIZED);
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
      profilePicture: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  return user ?? null;
}

export async function getSessionUserById(userId: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      role: true,
      profilePicture: true,
      tokenVersion: true,
    },
  });

  return user ? toSessionUser(user) : null;
}

export const adminUserSearchConfig = {
  fields: {
    username: ["CONTAINS", "STARTWITH", "EQUAL"] as const,
    role: ["EQUAL", "NOTEQUAL"] as const,
    createdAt: ["GREATEROREQUAL", "LESSEROREQUAL"] as const,
  },
  searchTermFields: ["username"] as const,
};

function adminUserSearchWhere(search: ParsedCollectionSearch) {
  const conditions: SQL[] = [];
  for (const item of search.search) {
    const value = String(item.value);
    if (item.name === "username") {
      if (item.condition === "CONTAINS") conditions.push(ilike(users.username, `%${escapeLikePattern(value)}%`));
      if (item.condition === "STARTWITH") conditions.push(ilike(users.username, `${escapeLikePattern(value)}%`));
      if (item.condition === "EQUAL") conditions.push(eq(users.username, value));
      continue;
    }
    if (item.name === "role") {
      if (!(["student", "admin"] as const).includes(value as "student" | "admin")) {
        throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      }
      conditions.push(item.condition === "EQUAL" ? eq(users.role, value) : ne(users.role, value));
      continue;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    conditions.push(item.condition === "GREATEROREQUAL" ? gte(users.createdAt, date) : lte(users.createdAt, date));
  }
  if (search.searchTerm) conditions.push(ilike(users.username, `%${escapeLikePattern(search.searchTerm.value)}%`));
  return and(...conditions);
}

async function queryUsersPage(search: ParsedCollectionSearch) {
  const db = getDb();
  const where = adminUserSearchWhere(search);
  const [rows, countRows] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(search.pageSize)
      .offset(pageOffset(search)),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
  ]);
  const items = rows.map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role,
    createdAt: row.createdAt,
  }));
  return createPagedResult(items, {
    currentPage: search.pageNumber,
    pageSize: search.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}

export function listUsersPage(input: { pageNumber: number; pageSize: number }) {
  return queryUsersPage(parseCollectionSearch(input, adminUserSearchConfig));
}

export function searchUsersPage(body: unknown) {
  return queryUsersPage(parseCollectionSearch(body, adminUserSearchConfig));
}

async function countAdmins() {
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "admin"));
  return Number(row?.count ?? 0);
}

export async function adminCreateUser(input: {
  username: string;
  password: string;
  role: "student" | "admin";
}) {
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.username, input.username), columns: { id: true } });
  if (existing) throw new AppError(Messages.usernameTaken, 409, ErrorCode.CONFLICT);

  const passwordHash = await argon2.hash(input.password);
  const [user] = await db.insert(users).values({
    username: input.username,
    passwordHash,
    role: input.role,
  }).returning({
    id: users.id,
    username: users.username,
    role: users.role,
    createdAt: users.createdAt,
  });
  if (!user) throw new AppError(Messages.unableToCreateUser, 500, ErrorCode.INTERNAL);
  return user;
}

export async function adminUpdateUser(input: {
  currentUserId: string;
  targetUserId: string;
  username: string;
  role: "student" | "admin";
}) {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, input.targetUserId) });
  if (!user) throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  if (user.id === input.currentUserId && input.role !== "admin") {
    throw new AppError("You can't remove your own admin access.", 400, ErrorCode.VALIDATION);
  }
  if (user.role === "admin" && input.role !== "admin" && await countAdmins() <= 1) {
    throw new AppError("At least one admin account is required.", 400, ErrorCode.VALIDATION);
  }
  if (user.role === "admin" && input.role !== "admin") {
    const ownedWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, user.id),
      columns: { id: true },
    });
    if (ownedWorkspace) {
      throw new AppError("Transfer this user's workspace ownership before removing admin access.", 400, ErrorCode.VALIDATION);
    }
  }
  const existing = await db.query.users.findFirst({ where: eq(users.username, input.username), columns: { id: true } });
  if (existing && existing.id !== input.targetUserId) {
    throw new AppError(Messages.usernameTaken, 409, ErrorCode.CONFLICT);
  }

  const roleChanged = user.role !== input.role;
  const [updated] = await db.update(users).set({
    username: input.username,
    role: input.role,
    updatedAt: new Date(),
    ...(roleChanged ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
  }).where(eq(users.id, input.targetUserId)).returning({
    id: users.id,
    username: users.username,
    role: users.role,
    createdAt: users.createdAt,
  });
  if (!updated) throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  return updated;
}

export async function adminDeleteUser(input: { currentUserId: string; targetUserId: string }) {
  if (input.currentUserId === input.targetUserId) {
    throw new AppError("You can't delete your own account.", 400, ErrorCode.VALIDATION);
  }
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, input.targetUserId) });
  if (!user) throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  if (user.role === "admin" && await countAdmins() <= 1) {
    throw new AppError("At least one admin account is required.", 400, ErrorCode.VALIDATION);
  }

  await db.transaction(async (tx) => {
    await tx.update(questions).set({ createdBy: null }).where(eq(questions.createdBy, input.targetUserId));
    await tx.update(workspaces).set({ ownerId: input.currentUserId }).where(eq(workspaces.ownerId, input.targetUserId));
    await tx.delete(users).where(eq(users.id, input.targetUserId));
  });
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
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  }

  const valid = await argon2.verify(user.passwordHash, input.currentPassword);

  if (!valid) {
    throw new AppError(Messages.currentPasswordIncorrect, 400, ErrorCode.VALIDATION);
  }

  const updatedUser = await updateUserPassword(user.id, input.newPassword);
  if (!updatedUser) {
    throw new AppError(Messages.unableToChangePassword, 500, ErrorCode.INTERNAL);
  }
  return toSessionUser(updatedUser);
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
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
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
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
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
    throw new AppError(Messages.resetLinkInvalid, 400, ErrorCode.VALIDATION);
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

  const [updatedUser] = await db
    .update(users)
    .set({
      passwordHash,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
      profilePicture: users.profilePicture,
      tokenVersion: users.tokenVersion,
    });

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));

  return updatedUser;
}

export async function updateProfilePicture(userId: string, profilePicture: string) {
  const db = getDb();
  
  const [updatedUser] = await db
    .update(users)
    .set({
      profilePicture,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
      profilePicture: users.profilePicture,
      tokenVersion: users.tokenVersion,
    });

  if (!updatedUser) {
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  }

  return toSessionUser(updatedUser);
}

export async function updateUsername(userId: string, newUsername: string) {
  const db = getDb();
  
  const existing = await db.query.users.findFirst({
    where: eq(users.username, newUsername),
  });
  
  if (existing) {
    if (existing.id === userId) {
      return toSessionUser(existing);
    }
    throw new AppError(Messages.usernameTaken, 409, ErrorCode.CONFLICT);
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      username: newUsername,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
      profilePicture: users.profilePicture,
      tokenVersion: users.tokenVersion,
    });

  if (!updatedUser) {
    throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  }

  return toSessionUser(updatedUser);
}
