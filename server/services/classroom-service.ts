import "server-only";

import { and, eq } from "drizzle-orm";

import {
  assignmentQuestions,
  assignments,
  classroomMembers,
  classrooms,
  questions,
} from "@/db/schema";
import { getDb } from "@/lib/db";

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
    throw new Error("Unable to create classroom.");
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
    throw new Error("Classroom not found.");
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
    throw new Error("Unable to create assignment.");
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

export async function listPublishedQuestions() {
  const db = getDb();
  return db.query.questions.findMany({
    where: eq(questions.isPublished, true),
    orderBy: (fields, ops) => [ops.asc(fields.title)],
  });
}
