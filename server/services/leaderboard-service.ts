import { eq, sql } from "drizzle-orm";

import { classrooms, leaderboards, questionScores } from "@/db/schema";
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

// Aggregates best scores across all classroom questions per member.
// Avoids deep Drizzle nesting by using two separate queries.
export async function getClassroomLeaderboard(classroomId: string) {
  const db = getDb();

  // Step 1: fetch classroom members + assignment question IDs (no deep nesting)
  const classroom = await db.query.classrooms.findFirst({
    where: eq(classrooms.id, classroomId),
    with: {
      members: {
        with: {
          user: { columns: { id: true, username: true, role: true } },
        },
      },
      assignments: {
        with: {
          assignmentQuestions: { columns: { questionId: true } },
        },
      },
    },
  });

  if (!classroom) return [];

  const allQuestionIds = [
    ...new Set(
      classroom.assignments.flatMap((a) => a.assignmentQuestions.map((aq) => aq.questionId)),
    ),
  ];

  const memberUserIds = classroom.members.map((m) => m.user.id);

  // Step 2: fetch scores for those members + questions separately
  const scores =
    allQuestionIds.length > 0 && memberUserIds.length > 0
      ? await db.query.questionScores.findMany({
          where: (qs, { and: andFn, inArray: inArrayFn }) =>
            andFn(inArrayFn(qs.userId, memberUserIds), inArrayFn(qs.questionId, allQuestionIds)),
          columns: { userId: true, questionId: true, bestScore: true, attempts: true },
        })
      : [];

  // Step 3: aggregate per user
  const scoreMap = new Map<string, { totalScore: number; solved: number }>();
  for (const s of scores) {
    const prev = scoreMap.get(s.userId) ?? { totalScore: 0, solved: 0 };
    scoreMap.set(s.userId, {
      totalScore: prev.totalScore + parseFloat(s.bestScore ?? "0"),
      solved: prev.solved + (s.attempts > 0 && parseFloat(s.bestScore ?? "0") > 0 ? 1 : 0),
    });
  }

  const rows = classroom.members.map((m) => {
    const agg = scoreMap.get(m.user.id) ?? { totalScore: 0, solved: 0 };
    return {
      userId: m.user.id,
      username: m.user.username,
      role: m.role,
      totalScore: agg.totalScore,
      solved: agg.solved,
    };
  });

  rows.sort((a, b) => b.totalScore - a.totalScore || a.username.localeCompare(b.username));
  return rows;
}
