import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { gradingJobs, questions, rejudgeJobs, submissionRuns, submissions } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { executeIdempotentMutation } from "@/server/security/idempotency";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceStaff } from "@/server/workspaces/authorization";

type Db = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function allocateNextRun(tx: Transaction, submissionId: string) {
  const [row] = await tx.select({ sequence: sql<number>`coalesce(max(${submissionRuns.sequence}), 0)::int + 1` })
    .from(submissionRuns).where(eq(submissionRuns.submissionId, submissionId));
  return row?.sequence ?? 1;
}

export async function rejudgeSubmission(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  submissionId: string;
  idempotency?: {
    identifier: string;
    action: string;
    key: string;
    requestHash: string;
  };
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const db = getDb();
  const mutate = async (tx: Transaction) => {
    await tx.execute(sql`select id from submissions where id = ${input.submissionId} for update`);
    const submission = await tx.query.submissions.findFirst({
      where: eq(submissions.id, input.submissionId),
      with: { question: { columns: { workspaceId: true } } },
    });
    if (!submission || submission.question.workspaceId !== input.workspaceId) {
      throw new AppError(Messages.submissionNotFound, 404, ErrorCode.NOT_FOUND);
    }

    const [parent] = await tx.insert(rejudgeJobs).values({
      workspaceId: input.workspaceId,
      submissionId: submission.id,
      requestedBy: input.actor.userId,
      status: "queued",
      totalCount: 1,
    }).returning();
    const runId = crypto.randomUUID();
    await tx.insert(submissionRuns).values({
      id: runId,
      submissionId: submission.id,
      sequence: await allocateNextRun(tx, submission.id),
      trigger: "rejudge",
      requestedBy: input.actor.userId,
      status: "queued",
    });
    await tx.update(submissions).set({ latestRunId: runId, status: "queued", errorMessage: null })
      .where(eq(submissions.id, submission.id));
    const [job] = await tx.insert(gradingJobs).values({
      submissionId: submission.id,
      submissionRunId: runId,
      rejudgeJobId: parent!.id,
      status: "queued",
    }).returning();

    return { rejudgeJob: parent!, gradingJob: job! };
  };

  return input.idempotency
    ? executeIdempotentMutation({ ...input.idempotency, responseStatus: 202, mutate })
    : db.transaction(mutate);
}

export async function rejudgeQuestion(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  idempotency?: {
    identifier: string;
    action: string;
    key: string;
    requestHash: string;
  };
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const db = getDb();
  const mutate = async (tx: Transaction) => {
    const question = await tx.query.questions.findFirst({
      where: and(eq(questions.id, input.questionId), eq(questions.workspaceId, input.workspaceId)),
      columns: { id: true },
    });
    if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);

    await tx.execute(sql`select id from submissions where question_id = ${question.id} order by id for update`);
    const targetSubmissions = await tx.query.submissions.findMany({
      where: eq(submissions.questionId, question.id),
      columns: { id: true },
      orderBy: (fields, ops) => [ops.asc(fields.id)],
    });
    const empty = targetSubmissions.length === 0;
    const [parent] = await tx.insert(rejudgeJobs).values({
      workspaceId: input.workspaceId,
      questionId: question.id,
      requestedBy: input.actor.userId,
      status: empty ? "completed" : "queued",
      totalCount: targetSubmissions.length,
      completedAt: empty ? new Date() : null,
    }).returning();
    const jobs: Array<{ id: string }> = [];

    for (const submission of targetSubmissions) {
      const runId = crypto.randomUUID();
      await tx.insert(submissionRuns).values({
        id: runId,
        submissionId: submission.id,
        sequence: await allocateNextRun(tx, submission.id),
        trigger: "rejudge",
        requestedBy: input.actor.userId,
        status: "queued",
      });
      await tx.update(submissions).set({ latestRunId: runId, status: "queued", errorMessage: null })
        .where(eq(submissions.id, submission.id));
      const [job] = await tx.insert(gradingJobs).values({
        submissionId: submission.id,
        submissionRunId: runId,
        rejudgeJobId: parent!.id,
        status: "queued",
      }).returning({ id: gradingJobs.id });
      if (job) jobs.push(job);
    }

    return { rejudgeJob: parent!, gradingJobs: jobs };
  };

  return input.idempotency
    ? executeIdempotentMutation({ ...input.idempotency, responseStatus: 202, mutate })
    : db.transaction(mutate);
}
