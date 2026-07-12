import "server-only";

import { and, desc, eq, gt, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { workspaceMembers, questions, submissionRuns, submissions, testcaseResults, users } from "@/db/schema";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import type { AuthorizedWorkspace, WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";

function parseSubmissionCursor(cursor: string | null, scope: string, filters: string) {
  if (!cursor) return undefined;
  try {
    const decoded = decodeCursor(cursor, { endpoint: "workspace-submissions", scope, filters });
    const [createdAtValue, id] = decoded.keys;
    if (typeof createdAtValue !== "string" || typeof id !== "string") throw new Error();
    const createdAt = new Date(createdAtValue);
    if (Number.isNaN(createdAt.getTime())) throw new Error();
    return or(
      lt(submissions.createdAt, createdAt),
      and(eq(submissions.createdAt, createdAt), lt(submissions.id, id)),
    );
  } catch {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
}

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
  limit: number;
  cursor: string | null;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  await validateSubmissionFilters({ ...input, access });
  const effectiveStudentId = access.staff ? input.studentId : input.actor.userId;
  const filters = `question=${input.questionId ?? ""}&student=${effectiveStudentId ?? ""}`;
  const after = parseSubmissionCursor(input.cursor, input.workspaceId, filters);
  const latestRun = alias(submissionRuns, "submission_latest_run_dto");
  const latestScored = alias(submissionRuns, "submission_latest_scored_dto");
  const db = getDb();
  const rows = await db.select({
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
    .where(and(
      input.questionId ? eq(submissions.questionId, input.questionId) : undefined,
      effectiveStudentId ? eq(submissions.userId, effectiveStudentId) : undefined,
      after,
    ))
    .orderBy(desc(submissions.createdAt), desc(submissions.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({
      endpoint: "workspace-submissions",
      scope: input.workspaceId,
      filters,
      keys: [last.createdAt.toISOString(), last.id],
    }) : null,
  };
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
  limit: number;
  cursor: string | null;
}) {
  const { access } = await requireVisibleSubmission(input.actor, input.workspaceId, input.submissionId);
  const endpoint = "submission-runs";
  const scope = `${input.workspaceId}:${input.submissionId}`;
  const filters = "";
  let after: ReturnType<typeof or> | undefined;
  if (input.cursor) {
    try {
      const decoded = decodeCursor(input.cursor, { endpoint, scope, filters });
      const [sequence, id] = decoded.keys;
      if (typeof sequence !== "number" || typeof id !== "string") throw new Error();
      after = or(
        lt(submissionRuns.sequence, sequence),
        and(eq(submissionRuns.sequence, sequence), lt(submissionRuns.id, id)),
      );
    } catch {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
  }
  const db = getDb();
  const rows = await db.query.submissionRuns.findMany({
    where: and(eq(submissionRuns.submissionId, input.submissionId), after),
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
    limit: input.limit + 1,
  });
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((item) => ({
    ...item,
    errorMessage: access.staff ? item.errorMessage : null,
  }));
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ endpoint, scope, filters, keys: [last.sequence, last.id] }) : null,
  };
}

export async function listRunResultsPage(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  submissionId: string;
  runId: string;
  limit: number;
  cursor: string | null;
}) {
  const { access } = await requireVisibleSubmission(input.actor, input.workspaceId, input.submissionId);
  const db = getDb();
  const run = await db.query.submissionRuns.findFirst({
    where: and(eq(submissionRuns.id, input.runId), eq(submissionRuns.submissionId, input.submissionId)),
    columns: { id: true },
  });
  if (!run) throw new AppError(Messages.submissionNotFound, 404, ErrorCode.NOT_FOUND);

  const endpoint = "run-results";
  const scope = `${input.workspaceId}:${input.submissionId}:${input.runId}`;
  const filters = "";
  let after: ReturnType<typeof or> | undefined;
  if (input.cursor) {
    try {
      const decoded = decodeCursor(input.cursor, { endpoint, scope, filters });
      const [sortOrder, id] = decoded.keys;
      if (typeof sortOrder !== "number" || typeof id !== "string") throw new Error();
      after = or(
        gt(testcaseResults.testcaseSortOrder, sortOrder),
        and(eq(testcaseResults.testcaseSortOrder, sortOrder), gt(testcaseResults.id, id)),
      );
    } catch {
      throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
    }
  }
  const rows = await db.query.testcaseResults.findMany({
    where: and(eq(testcaseResults.submissionRunId, input.runId), after),
    orderBy: (fields, ops) => [ops.asc(fields.testcaseSortOrder), ops.asc(fields.id)],
    limit: input.limit + 1,
  });
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((item) => ({
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
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ endpoint, scope, filters, keys: [last.testcaseSortOrder, last.id] }) : null,
  };
}
