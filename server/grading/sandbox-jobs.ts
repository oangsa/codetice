import "server-only";

import { and, eq, inArray, lt } from "drizzle-orm";

import { sandboxJobs, supportedLanguages } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getWorkspaceQuestionById } from "@/server/questions/queries";
import { executeIdempotentMutation, type IdempotencyRequest } from "@/server/security/idempotency";
import { enabledLanguageOptionsWhere } from "@/server/languages/options";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";

const SANDBOX_JOB_TTL_MS = 24 * 60 * 60 * 1000;

async function validateSandboxRequest(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  language: string;
}) {
  const question = await getWorkspaceQuestionById(input.actor, input.workspaceId, input.questionId);
  if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
  if (question.allowedLanguages.length > 0 && !question.allowedLanguages.includes(input.language)) {
    throw new AppError(Messages.languageNotAllowed, 400, ErrorCode.VALIDATION);
  }
  const language = await getDb().query.supportedLanguages.findFirst({
    where: enabledLanguageOptionsWhere(input.language),
  });
  if (!language) throw new AppError(Messages.languageUnavailable, 400, ErrorCode.VALIDATION);
  return { question, language };
}

export async function enqueueSampleJob(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  sourceCode: string;
  language: string;
  idempotency: IdempotencyRequest;
}) {
  await validateSandboxRequest(input);
  const jobId = crypto.randomUUID();
  return executeIdempotentMutation({
    ...input.idempotency,
    responseStatus: 202,
    mutate: async (tx) => {
      await tx.insert(sandboxJobs).values({
        id: jobId,
        workspaceId: input.workspaceId,
        questionId: input.questionId,
        requestedBy: input.actor.userId,
        kind: "sample",
        language: input.language,
        sourceCode: input.sourceCode,
        expiresAt: new Date(Date.now() + SANDBOX_JOB_TTL_MS),
      });
      return { job: { id: jobId, status: "queued" as const, kind: "sample" as const } };
    },
  });
}

export async function enqueueCompilerDiagnosticsJob(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  sourceCode: string;
  language: string;
}) {
  const { language } = await validateSandboxRequest(input);
  if (language.diagnosticsFormat !== "compiler") {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.update(sandboxJobs).set({
      status: "cancelled",
      sourceCode: null,
      completedAt: new Date(),
    }).where(and(
      eq(sandboxJobs.workspaceId, input.workspaceId),
      eq(sandboxJobs.questionId, input.questionId),
      eq(sandboxJobs.requestedBy, input.actor.userId),
      eq(sandboxJobs.language, input.language),
      eq(sandboxJobs.kind, "compiler_diagnostics"),
      eq(sandboxJobs.status, "queued"),
    ));
    const [job] = await tx.insert(sandboxJobs).values({
      workspaceId: input.workspaceId,
      questionId: input.questionId,
      requestedBy: input.actor.userId,
      kind: "compiler_diagnostics",
      language: input.language,
      sourceCode: input.sourceCode,
      expiresAt: new Date(Date.now() + SANDBOX_JOB_TTL_MS),
    }).returning({ id: sandboxJobs.id, status: sandboxJobs.status, kind: sandboxJobs.kind });
    return { job: job! };
  });
}

export async function getSandboxJob(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  jobId: string;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const job = await getDb().query.sandboxJobs.findFirst({
    where: and(
      eq(sandboxJobs.id, input.jobId),
      eq(sandboxJobs.workspaceId, input.workspaceId),
      access.staff ? undefined : eq(sandboxJobs.requestedBy, input.actor.userId),
    ),
    columns: {
      id: true,
      kind: true,
      status: true,
      result: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
  });
  if (!job) throw new AppError("Sandbox job not found.", 404, ErrorCode.NOT_FOUND);
  return job;
}

export async function cleanupExpiredSandboxJobs() {
  await getDb().delete(sandboxJobs).where(and(
    inArray(sandboxJobs.status, ["completed", "failed", "cancelled"]),
    lt(sandboxJobs.expiresAt, new Date()),
  ));
}

export async function getDiagnosticsLanguage(slug: string) {
  return getDb().query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.slug, slug),
  });
}
