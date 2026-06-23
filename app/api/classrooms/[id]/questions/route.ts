import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { ok, fail, Messages, ErrorCode } from "@/lib/api";
import { getDb } from "@/lib/db";
import { assignmentQuestions, assignments, classroomMembers, questions, testcases } from "@/db/schema";
import { createUniqueQuestionSlug } from "@/server/services/question-service";

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
  description: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  totalScore: z.number().positive().default(100),
  timeLimitMs: z.number().int().positive().default(2000),
  memoryLimitMb: z.number().int().positive().default(128),
  starterCode: z.string().optional(),
  isPublished: z.boolean().default(false),
  assignmentTitle: z.string().min(1).default("General"),
  assignmentDueAt: z.string().nullable().optional(),
  allowedLanguages: z.array(z.string()).optional().nullable(),
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
      return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
    }
  }

  const body = await _request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }

  const input = parsed.data;
  const db = getDb();
  const slug = await createUniqueQuestionSlug(input.title);

  // Create question
  const [question] = await db
    .insert(questions)
    .values({
      title: input.title,
      slug,
      description: input.description,
      difficulty: input.difficulty,
      totalScore: String(input.totalScore),
      timeLimitMs: input.timeLimitMs,
      memoryLimitMb: input.memoryLimitMb,
      starterCode: input.starterCode ?? null,
      starterCodeByLanguage: "{}",
      allowedLanguages: input.allowedLanguages ? JSON.stringify(input.allowedLanguages) : null,
      isPublished: input.isPublished,
      createdBy: session.userId,
    })
    .returning();

  if (!question) {
    return fail(Messages.unableToCreateQuestion, 500, { code: ErrorCode.INTERNAL });
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
    return fail(Messages.unableToCreateAssignment, 500, { code: ErrorCode.INTERNAL });
  }

  // Add question to assignment
  await db.insert(assignmentQuestions).values({
    assignmentId: assignment.id,
    questionId: question.id,
    sortOrder: 0,
  });

  return ok({ question: { id: question.id, slug: question.slug } }, { status: 201 });
}
