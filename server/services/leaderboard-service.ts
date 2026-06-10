import "server-only";

import { eq, sql } from "drizzle-orm";

import { leaderboards, questionScores } from "@/db/schema";
import { getDb } from "@/lib/db";

export async function recomputeLeaderboardForUser(userId: string) {
  const db = getDb();
  const [aggregate] = await db
    .select({
      totalScore: sql<string>`coalesce(sum(${questionScores.bestScore}), 0)::text`,
      solvedCount: sql<number>`count(*)::int`,
    })
    .from(questionScores)
    .where(eq(questionScores.userId, userId));

  const existing = await db.query.leaderboards.findFirst({
    where: eq(leaderboards.userId, userId),
  });

  if (existing) {
    await db
      .update(leaderboards)
      .set({
        totalScore: aggregate?.totalScore ?? "0",
        solvedCount: aggregate?.solvedCount ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(leaderboards.id, existing.id));
    return;
  }

  await db.insert(leaderboards).values({
    userId,
    totalScore: aggregate?.totalScore ?? "0",
    solvedCount: aggregate?.solvedCount ?? 0,
  });
}

export async function getGlobalLeaderboard() {
  const db = getDb();
  return db.query.leaderboards.findMany({
    with: {
      user: {
        columns: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: (fields, ops) => [ops.desc(fields.totalScore), ops.desc(fields.solvedCount), ops.asc(fields.updatedAt)],
    limit: 100,
  });
}

export async function getQuestionLeaderboard(questionId: string) {
  const db = getDb();
  return db.query.questionScores.findMany({
    where: eq(questionScores.questionId, questionId),
    with: {
      user: {
        columns: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: (fields, ops) => [ops.desc(fields.bestScore), ops.asc(fields.updatedAt)],
    limit: 100,
  });
}
