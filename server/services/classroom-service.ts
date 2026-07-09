import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  assignmentQuestions,
  assignments,
  classroomMembers,
  classrooms,
  questions,
} from "@/db/schema";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { buildClassroomQuestionRows } from "@/lib/classroom-question-rows";

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createClassroom(input: { name: string; createdBy: string }) {
  const db = getDb();
  const [classroom] = await db
    .insert(classrooms)
    .values({
      name: input.name,
      inviteCode: generateInviteCode(),
      createdBy: input.createdBy,
    })
    .returning();

  if (!classroom) {
    throw new AppError(Messages.unableToCreateClassroom, 500, ErrorCode.INTERNAL);
  }

  await db.insert(classroomMembers).values({
    classroomId: classroom.id,
    userId: input.createdBy,
    role: "teacher",
  });

  return classroom;
}

export async function joinClassroom(inviteCode: string, userId: string) {
  const db = getDb();
  const classroom = await db.query.classrooms.findFirst({
    where: eq(classrooms.inviteCode, inviteCode),
  });

  if (!classroom) {
    throw new AppError(Messages.classroomNotFound, 404, ErrorCode.NOT_FOUND);
  }

  const existing = await db.query.classroomMembers.findFirst({
    where: and(eq(classroomMembers.classroomId, classroom.id), eq(classroomMembers.userId, userId)),
  });

  if (existing) {
    return classroom;
  }

  await db.insert(classroomMembers).values({
    classroomId: classroom.id,
    userId,
    role: "student",
  });

  return classroom;
}

export async function listClassroomsForUser(userId: string, role: "student" | "admin") {
  const db = getDb();
  if (role === "admin") {
    return db.query.classrooms.findMany({
      with: {
        members: true,
      },
      orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
    });
  }

  return db.query.classroomMembers.findMany({
    where: eq(classroomMembers.userId, userId),
    with: {
      classroom: {
        with: {
          members: true,
        },
      },
    },
    orderBy: (fields, ops) => [ops.desc(fields.joinedAt)],
  });
}

export async function listManagedClassrooms(userId: string) {
  const db = getDb();
  return db.query.classrooms.findMany({
    where: eq(classrooms.createdBy, userId),
    with: {
      members: true,
    },
    orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
  });
}

export async function listEnrolledClassrooms(userId: string) {
  const db = getDb();
  const memberships = await db.query.classroomMembers.findMany({
    where: eq(classroomMembers.userId, userId),
    with: {
      classroom: {
        with: {
          members: true,
        },
      },
    },
    orderBy: (fields, ops) => [ops.desc(fields.joinedAt)],
  });

  return memberships.map((membership) => membership.classroom);
}

export async function getClassroomById(classroomId: string) {
  const db = getDb();
  return db.query.classrooms.findFirst({
    where: eq(classrooms.id, classroomId),
    with: {
      members: {
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
      assignments: {
        with: {
          assignmentQuestions: {
            with: {
              question: true,
            },
          },
        },
        orderBy: (fields, ops) => [ops.asc(fields.dueAt), ops.asc(fields.createdAt)],
      },
    },
  });
}

export async function createAssignment(input: {
  classroomId: string;
  title: string;
  description?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  questionIds: string[];
}) {
  const db = getDb();
  const [assignment] = await db
    .insert(assignments)
    .values({
      classroomId: input.classroomId,
      title: input.title,
      description: input.description ?? null,
      startAt: input.startAt ? new Date(input.startAt) : null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    })
    .returning();

  if (!assignment) {
    throw new AppError(Messages.unableToCreateAssignment, 500, ErrorCode.INTERNAL);
  }

  await db.insert(assignmentQuestions).values(
    input.questionIds.map((questionId, index) => ({
      assignmentId: assignment.id,
      questionId,
      sortOrder: index,
    })),
  );

  return assignment;
}

export async function listAssignmentsForUser(userId: string, role: "student" | "admin") {
  const db = getDb();
  if (role === "admin") {
    return db.query.assignments.findMany({
      with: {
        classroom: true,
        assignmentQuestions: {
          with: {
            question: true,
          },
        },
      },
      orderBy: (fields, ops) => [ops.asc(fields.dueAt), ops.desc(fields.createdAt)],
    });
  }

  const memberships = await db.query.classroomMembers.findMany({
    where: eq(classroomMembers.userId, userId),
    columns: {
      classroomId: true,
    },
  });

  if (memberships.length === 0) {
    return [];
  }

  return db.query.assignments.findMany({
    where: (fields, { inArray }) => inArray(fields.classroomId, memberships.map((item) => item.classroomId)),
    with: {
      classroom: true,
      assignmentQuestions: {
        with: {
          question: true,
        },
      },
    },
    orderBy: (fields, ops) => [ops.asc(fields.dueAt), ops.desc(fields.createdAt)],
  });
}

export async function getAssignmentById(assignmentId: string) {
  const db = getDb();
  return db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
    with: {
      classroom: true,
      assignmentQuestions: {
        with: {
          question: true,
        },
        orderBy: (fields, ops) => [ops.asc(fields.sortOrder)],
      },
    },
  });
}

// Get all questions in a classroom (flattened from assignments) with user's scores.
// NOTE: We intentionally avoid nesting questionScores inside the classroom query because
// Drizzle generates a join alias like "classrooms_assignments_assignmentQuestions_question_questionScores"
// which exceeds PostgreSQL's 63-character identifier limit and gets silently truncated.
export async function getClassroomQuestionsForUser(classroomId: string, userId: string, includeHidden: boolean = false) {
  const db = getDb();
  const visibilityFilter = includeHidden
    ? eq(assignments.classroomId, classroomId)
    : and(eq(assignments.classroomId, classroomId), eq(questions.isPublished, true));

  // Step 1: fetch assignment questions as flat rows so hidden questions are filtered in SQL.
  const questionRows = await db
    .select({
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      dueAt: assignments.dueAt,
      questionId: questions.id,
      title: questions.title,
      slug: questions.slug,
      difficulty: questions.difficulty,
      totalScore: questions.totalScore,
      isPublished: questions.isPublished,
    })
    .from(assignments)
    .innerJoin(assignmentQuestions, eq(assignmentQuestions.assignmentId, assignments.id))
    .innerJoin(questions, eq(questions.id, assignmentQuestions.questionId))
    .where(visibilityFilter)
    .orderBy(asc(assignments.dueAt), asc(assignments.createdAt), asc(assignmentQuestions.sortOrder));

  // Collect unique question IDs across all assignments
  const allQuestionIds = [...new Set(questionRows.map((row) => row.questionId))];

  // Step 2: fetch questionScores separately to avoid identifier truncation
  const userScores =
    allQuestionIds.length > 0
      ? await db.query.questionScores.findMany({
          where: (qs, { and: andFn, eq: eqFn, inArray: inArrayFn }) =>
            andFn(eqFn(qs.userId, userId), inArrayFn(qs.questionId, allQuestionIds)),
          columns: { questionId: true, bestScore: true, attempts: true },
        })
      : [];

  return buildClassroomQuestionRows(questionRows, userScores, { includeHidden });
}

// Get classrooms with stats (member count, question count, user progress)
export async function listClassroomsWithStats(userId: string, role: string) {
  const db = getDb();

  let rawClassrooms: Array<{
    id: string;
    name: string;
    inviteCode: string;
    createdBy: string | null;
    createdAt: Date;
    members: Array<{ userId: string; role: string; joinedAt: Date }>;
    assignments: Array<{
      assignmentQuestions: Array<{ questionId: string }>;
    }>;
    creator: { username: string } | null;
  }>;

  if (role === "admin") {
    rawClassrooms = (await db.query.classrooms.findMany({
      with: {
        members: true,
        assignments: { with: { assignmentQuestions: { columns: { questionId: true } } } },
        creator: { columns: { username: true } },
      },
      orderBy: (fields, ops) => [ops.desc(fields.createdAt)],
    })) as typeof rawClassrooms;
  } else {
    const memberships = await db.query.classroomMembers.findMany({
      where: eq(classroomMembers.userId, userId),
      with: {
        classroom: {
          with: {
            members: true,
            assignments: { with: { assignmentQuestions: { columns: { questionId: true } } } },
            creator: { columns: { username: true } },
          },
        },
      },
      orderBy: (fields, ops) => [ops.desc(fields.joinedAt)],
    });
    rawClassrooms = memberships.map((m) => m.classroom) as typeof rawClassrooms;
  }

  // Get user's question scores for progress computation
  const allQuestionIds = rawClassrooms.flatMap((c) =>
    c.assignments.flatMap((a) => a.assignmentQuestions.map((aq) => aq.questionId)),
  );

  const userScores =
    allQuestionIds.length > 0
      ? await db.query.questionScores.findMany({
          where: (qs, { and: andFn, eq: eqFn, inArray: inArrayFn }) =>
            andFn(eqFn(qs.userId, userId), inArrayFn(qs.questionId, allQuestionIds)),
          columns: { questionId: true, attempts: true },
        })
      : [];

  const attemptedSet = new Set(userScores.filter((s) => s.attempts > 0).map((s) => s.questionId));

  return rawClassrooms.map((c) => {
    const membership = c.members.find((m) => m.userId === userId);
    const uniqueQuestionIds = [...new Set(c.assignments.flatMap((a) => a.assignmentQuestions.map((aq) => aq.questionId)))];
    const questionCount = uniqueQuestionIds.length;
    const solvedCount = uniqueQuestionIds.filter((qid) => attemptedSet.has(qid)).length;
    const progressPercent = questionCount > 0 ? Math.round((solvedCount / questionCount) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      inviteCode: c.inviteCode,
      createdBy: c.createdBy,
      creatorName: c.creator?.username ?? "Unknown",
      createdAt: c.createdAt,
      memberCount: c.members.length,
      questionCount,
      solvedCount,
      progressPercent,
      joinedAt: membership?.joinedAt ?? c.createdAt,
      userRole: membership?.role ?? "student",
    };
  });
}

export async function listPublishedQuestions() {
  const db = getDb();
  return db.query.questions.findMany({
    where: eq(questions.isPublished, true),
    orderBy: (fields, ops) => [ops.asc(fields.title)],
  });
}
