import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { getDb } from "@/lib/db";
import { assignmentQuestions, assignments, classroomMembers, questions, testcases } from "@/db/schema";

const testcaseSchema = z.object({
  name: z.string().optional(),
  input: z.string(),
  expectedOutput: z.string(),
  isSample: z.boolean().default(false),
  isHidden: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const bodySchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  totalScore: z.number().positive().default(100),
  timeLimitMs: z.number().int().positive().default(2000),
  memoryLimitMb: z.number().int().positive().default(128),
  starterCode: z.string().optional(),
  isPublished: z.boolean().default(false),
  assignmentTitle: z.string().min(1).default("General"),
  assignmentDueAt: z.string().nullable().optional(),
  testcases: z.array(testcaseSchema).default([]),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUser();
  const { id: classroomId } = await params;

  if (session.role !== "admin") {
    const db = getDb();
    const membership = await db.query.classroomMembers.findFirst({
      where: and(
        eq(classroomMembers.classroomId, classroomId),
        eq(classroomMembers.userId, session.userId),
      ),
    });
    if (!membership || membership.role !== "teacher") {
      return fail("Forbidden.", 403);
    }
  }

  const body = await _request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const input = parsed.data;
  const db = getDb();

  // Check slug uniqueness
  const existing = await db.query.questions.findFirst({
    where: eq(questions.slug, input.slug),
    columns: { id: true },
  });
  if (existing) {
    return fail("Slug already in use.", 409);
  }

  // Create question
  const [question] = await db
    .insert(questions)
    .values({
      title: input.title,
      slug: input.slug,
      description: input.description,
      difficulty: input.difficulty,
      totalScore: String(input.totalScore),
      timeLimitMs: input.timeLimitMs,
      memoryLimitMb: input.memoryLimitMb,
      starterCode: input.starterCode ?? null,
      starterCodeByLanguage: "{}",
      isPublished: input.isPublished,
      createdBy: session.userId,
    })
    .returning();

  if (!question) {
    return fail("Failed to create question.", 500);
  }

  // Create testcases
  if (input.testcases.length > 0) {
    await db.insert(testcases).values(
      input.testcases.map((tc) => ({
        questionId: question.id,
        name: tc.name ?? null,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample,
        isHidden: tc.isHidden,
        sortOrder: tc.sortOrder,
      })),
    );
  }

  // Find or create assignment for this classroom
  let assignment = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.classroomId, classroomId),
      eq(assignments.title, input.assignmentTitle),
    ),
    columns: { id: true },
  });

  if (!assignment) {
    const [newAssignment] = await db
      .insert(assignments)
      .values({
        classroomId,
        title: input.assignmentTitle,
        dueAt: input.assignmentDueAt ? new Date(input.assignmentDueAt) : null,
      })
      .returning();
    assignment = newAssignment;
  }

  if (!assignment) {
    return fail("Failed to create assignment.", 500);
  }

  // Add question to assignment
  await db.insert(assignmentQuestions).values({
    assignmentId: assignment.id,
    questionId: question.id,
    sortOrder: 0,
  });

  return ok({ question: { id: question.id, slug: question.slug } }, { status: 201 });
}
