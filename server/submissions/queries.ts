import "server-only";

import { and, desc, eq, gte, ilike, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { workspaceMembers, questions, submissionRuns, submissions, testcaseResults, users } from "@/db/schema";
import { escapeLikePattern, parseCollectionSearch, type ParsedCollectionSearch } from "@/lib/collection-search";
import { getDb } from "@/lib/db";
import { createPagedResult, pageOffset } from "@/lib/pagination";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import type { AuthorizedWorkspace, WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";

async function validateSubmissionFilters(input: {
  workspaceId: string;
  actor: WorkspaceActor;
  access: AuthorizedWorkspace;
  questionId: string | null;
  studentId: string | null;
}) {
  const db = getDb();
  if (input.questionId) {
    const question = await db.query.questions.findFirst({
      where: and(eq(questions.id, input.questionId), eq(questions.workspaceId, input.workspaceId)),
      columns: { id: true },
    });
    if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
  }
  if (!input.access.staff && input.studentId && input.studentId !== input.actor.userId) {
    throw new AppError(Messages.forbidden, 403, ErrorCode.FORBIDDEN);
  }
  if (input.access.staff && input.studentId) {
    const member = await db.select({ id: workspaceMembers.id }).from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.userId, input.studentId),
        eq(workspaceMembers.role, "student"),
        eq(users.role, "student"),
      )).limit(1);
    if (member.length === 0) throw new AppError(Messages.userNotFound, 404, ErrorCode.NOT_FOUND);
  }
}

export async function listWorkspaceSubmissionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string | null;
  studentId: string | null;
  pageNumber: number;
  pageSize: number;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  await validateSubmissionFilters({ ...input, access });
  const effectiveStudentId = access.staff ? input.studentId : input.actor.userId;
  const search = parseCollectionSearch({
    pageNumber: input.pageNumber,
    pageSize: input.pageSize,
    search: [
      ...(input.questionId ? [{ name: "questionId", condition: "EQUAL", value: input.questionId }] : []),
      ...(effectiveStudentId ? [{ name: "studentId", condition: "EQUAL", value: effectiveStudentId }] : []),
    ],
  }, workspaceSubmissionSearchConfig);
  return queryWorkspaceSubmissionsPage({ actor: input.actor, access, workspaceId: input.workspaceId, search });
}

export const workspaceSubmissionSearchConfig = {
  fields: {
    questionId: ["EQUAL"] as const,
    studentId: ["EQUAL"] as const,
    status: ["EQUAL", "NOTEQUAL"] as const,
    isRanked: ["EQUAL"] as const,
    createdAt: ["GREATEROREQUAL", "LESSEROREQUAL"] as const,
  },
  searchTermFields: ["questionTitle", "studentUsername"] as const,
};

function oneSearchValue(search: ParsedCollectionSearch, name: string) {
  const matches = search.search.filter((item) => item.name === name);
  if (matches.length > 1) throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  return matches[0]?.value;
}

async function queryWorkspaceSubmissionsPage(input: {
  actor: WorkspaceActor;
  access: AuthorizedWorkspace;
  workspaceId: string;
  search: ParsedCollectionSearch;
}) {
  const requestedStudentId = oneSearchValue(input.search, "studentId");
  const effectiveStudentId = input.access.staff
    ? (requestedStudentId ? String(requestedStudentId) : null)
    : input.actor.userId;
  const latestRun = alias(submissionRuns, "submission_latest_run_dto");
  const latestScored = alias(submissionRuns, "submission_latest_scored_dto");
  const db = getDb();
  const searchConditions: SQL[] = [];
  for (const item of input.search.search) {
    const value = String(item.value);
    if (item.name === "questionId") searchConditions.push(eq(submissions.questionId, value));
    if (item.name === "studentId") continue;
    if (item.name === "status") {
      if (!(["queued", "running", "accepted", "wrong_answer", "runtime_error", "time_limit_exceeded", "memory_limit_exceeded", "internal_error"] as const).includes(value as never)) {
        throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      }
      searchConditions.push(item.condition === "EQUAL" ? eq(latestRun.status, value) : ne(latestRun.status, value));
    }
    if (item.name === "isRanked") {
      if (typeof item.value !== "boolean") throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      searchConditions.push(eq(submissions.isRanked, item.value));
    }
    if (item.name === "createdAt") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
      searchConditions.push(item.condition === "GREATEROREQUAL" ? gte(submissions.createdAt, date) : lte(submissions.createdAt, date));
    }
  }
  if (input.search.searchTerm) {
    searchConditions.push(or(...input.search.searchTerm.names.map((name) => (
      name === "questionTitle"
        ? ilike(questions.title, `%${escapeLikePattern(input.search.searchTerm!.value)}%`)
        : ilike(users.username, `%${escapeLikePattern(input.search.searchTerm!.value)}%`)
    )))!);
  }

  const where = and(
      effectiveStudentId ? eq(submissions.userId, effectiveStudentId) : undefined,
      ...searchConditions,
    );
  const [rows, countRows] = await Promise.all([
    db.select({
      id: submissions.id,
      student: { id: users.id, username: users.username },
      question: { id: questions.id, title: questions.title, slug: questions.slug },
      latestStatus: latestRun.status,
      score: latestScored.score,
      isRanked: submissions.isRanked,
      createdAt: submissions.createdAt,
    }).from(submissions)
      .innerJoin(questions, and(eq(questions.id, submissions.questionId), eq(questions.workspaceId, input.workspaceId)))
      .innerJoin(users, eq(users.id, submissions.userId))
      .innerJoin(latestRun, eq(latestRun.id, submissions.latestRunId))
      .leftJoin(latestScored, eq(latestScored.id, submissions.latestScoredRunId))
      .where(where)
      .orderBy(desc(submissions.createdAt), desc(submissions.id))
      .limit(input.search.pageSize)
      .offset(pageOffset(input.search)),
    db.select({ count: sql<number>`count(*)::int` }).from(submissions)
      .innerJoin(questions, and(eq(questions.id, submissions.questionId), eq(questions.workspaceId, input.workspaceId)))
      .innerJoin(users, eq(users.id, submissions.userId))
      .innerJoin(latestRun, eq(latestRun.id, submissions.latestRunId))
      .where(where),
  ]);
  const items = rows.map((row) => ({
    id: row.id,
    student: row.student,
    question: row.question,
    latestStatus: row.latestStatus,
    score: row.score,
    isRanked: row.isRanked,
    createdAt: row.createdAt,
  }));
  return createPagedResult(items, {
    currentPage: input.search.pageNumber,
    pageSize: input.search.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}

export async function searchWorkspaceSubmissionsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  body: unknown;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const search = parseCollectionSearch(input.body, workspaceSubmissionSearchConfig);
  const questionId = oneSearchValue(search, "questionId");
  const studentId = oneSearchValue(search, "studentId");
  const uuid = z.string().uuid();
  if ((questionId && !uuid.safeParse(questionId).success) || (studentId && !uuid.safeParse(studentId).success)) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  await validateSubmissionFilters({
    workspaceId: input.workspaceId,
    actor: input.actor,
    access,
    questionId: questionId ? String(questionId) : null,
    studentId: studentId ? String(studentId) : null,
  });
  return queryWorkspaceSubmissionsPage({ ...input, access, search });
}

async function requireVisibleSubmission(actor: WorkspaceActor, workspaceId: string, submissionId: string) {
  const access = await requireWorkspaceMember(actor, workspaceId);
  const db = getDb();
  const submission = await db.query.submissions.findFirst({
    where: and(eq(submissions.id, submissionId), access.staff ? undefined : eq(submissions.userId, actor.userId)),
    with: {
      question: { columns: { id: true, workspaceId: true, title: true, slug: true } },
      user: { columns: { id: true, username: true } },
      latestRun: true,
      latestScoredRun: true,
    },
  });
  if (!submission || submission.question.workspaceId !== workspaceId) {
    throw new AppError(Messages.submissionNotFound, 404, ErrorCode.NOT_FOUND);
  }
  return { submission, access };
}

export async function authorizeWorkspaceSubmission(
  actor: WorkspaceActor,
  workspaceId: string,
  submissionId: string,
) {
  const { access } = await requireVisibleSubmission(actor, workspaceId, submissionId);
  return access;
}

export async function getWorkspaceSubmissionDetail(actor: WorkspaceActor, workspaceId: string, submissionId: string) {
  const { submission, access } = await requireVisibleSubmission(actor, workspaceId, submissionId);
  const latestRun = submission.latestRun;
  return {
    id: submission.id,
    student: submission.user,
    question: {
      id: submission.question.id,
      title: submission.question.title,
      slug: submission.question.slug,
    },
    language: submission.language,
    sourceCode: submission.sourceCode,
    isRanked: submission.isRanked,
    createdAt: submission.createdAt,
    latestRun: {
      id: latestRun.id,
      sequence: latestRun.sequence,
      trigger: latestRun.trigger,
      status: latestRun.status,
      passedCount: latestRun.passedCount,
      totalCount: latestRun.totalCount,
      score: latestRun.score,
      runtimeMs: latestRun.runtimeMs,
      memoryKb: latestRun.memoryKb,
      errorMessage: access.staff ? latestRun.errorMessage : null,
      createdAt: latestRun.createdAt,
      startedAt: latestRun.startedAt,
      completedAt: latestRun.completedAt,
    },
    latestScoredRunId: submission.latestScoredRunId,
    effectiveScore: submission.latestScoredRun?.score ?? null,
  };
}

export async function listSubmissionRunsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  submissionId: string;
  pageNumber: number;
  pageSize: number;
}) {
  const { access } = await requireVisibleSubmission(input.actor, input.workspaceId, input.submissionId);
  const db = getDb();
  const where = eq(submissionRuns.submissionId, input.submissionId);
  const [rows, countRows] = await Promise.all([
    db.query.submissionRuns.findMany({
      where,
      columns: {
        id: true,
        sequence: true,
        trigger: true,
        status: true,
        passedCount: true,
        totalCount: true,
        score: true,
        runtimeMs: true,
        memoryKb: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: (fields, ops) => [ops.desc(fields.sequence), ops.desc(fields.id)],
      limit: input.pageSize,
      offset: pageOffset(input),
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(submissionRuns).where(where),
  ]);
  const items = rows.map((item) => ({
    ...item,
    errorMessage: access.staff ? item.errorMessage : null,
  }));
  return createPagedResult(items, {
    currentPage: input.pageNumber,
    pageSize: input.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}

export async function listRunResultsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  submissionId: string;
  runId: string;
  pageNumber: number;
  pageSize: number;
}) {
  const { access } = await requireVisibleSubmission(input.actor, input.workspaceId, input.submissionId);
  const db = getDb();
  const run = await db.query.submissionRuns.findFirst({
    where: and(eq(submissionRuns.id, input.runId), eq(submissionRuns.submissionId, input.submissionId)),
    columns: { id: true },
  });
  if (!run) throw new AppError(Messages.submissionNotFound, 404, ErrorCode.NOT_FOUND);

  const where = eq(testcaseResults.submissionRunId, input.runId);
  const [rows, countRows] = await Promise.all([
    db.query.testcaseResults.findMany({
      where,
      orderBy: (fields, ops) => [ops.asc(fields.testcaseSortOrder), ops.asc(fields.id)],
      limit: input.pageSize,
      offset: pageOffset(input),
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(testcaseResults).where(where),
  ]);
  const items = rows.map((item) => ({
    id: item.id,
    testcaseName: item.testcaseName,
    testcaseSortOrder: item.testcaseSortOrder,
    isHidden: item.isHidden,
    status: item.status,
    expectedOutput: access.staff || !item.isHidden ? item.expectedOutput : null,
    actualOutput: access.staff || !item.isHidden ? item.actualOutput : null,
    errorMessage: access.staff ? item.errorMessage : null,
    runtimeMs: item.runtimeMs,
    memoryKb: item.memoryKb,
    passed: item.passed,
    createdAt: item.createdAt,
  }));
  return createPagedResult(items, {
    currentPage: input.pageNumber,
    pageSize: input.pageSize,
    totalCount: Number(countRows[0]?.count ?? 0),
  });
}
