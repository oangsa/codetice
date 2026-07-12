import "server-only";

import os from "node:os";

import { and, eq } from "drizzle-orm";

import { sandboxJobs } from "@/db/schema";
import { getDb, getSqlClient } from "@/lib/db";
import { AppError, Messages } from "@/lib/errors";
import { getLanguageDiagnostics } from "@/server/grading/language-diagnostics";
import { gradeCode } from "@/server/grading/service";
import { DEFAULT_GRADING_JOB_LEASE_SECONDS } from "@/server/grading/constants";
import { enabledLanguageOptionsWhere } from "@/server/languages/options";
import { prepareEnabledLanguageRuntime } from "@/server/languages/runtime-preparation.server";

type ClaimedSandboxJob = { id: string };

function getLeaseSeconds() {
  const configured = Number(process.env.GRADING_JOB_LEASE_SECONDS ?? DEFAULT_GRADING_JOB_LEASE_SECONDS);
  return Number.isFinite(configured) ? Math.max(60, Math.floor(configured)) : DEFAULT_GRADING_JOB_LEASE_SECONDS;
}

function createWorkerId() {
  return `sandbox:${os.hostname()}:${process.pid}`;
}

async function claimNextSandboxJob(workerId: string) {
  const rows = await getSqlClient()<ClaimedSandboxJob[]>`
    with candidate as (
      select id from sandbox_jobs
      where status = 'queued'
         or (status = 'running' and completed_at is null and lease_expires_at < now())
      order by created_at asc, id asc
      for update skip locked
      limit 1
    )
    update sandbox_jobs sj
    set status = 'running',
        attempts = sj.attempts + 1,
        locked_by = ${workerId},
        lease_expires_at = now() + make_interval(secs => ${getLeaseSeconds()}),
        started_at = coalesce(sj.started_at, now()),
        completed_at = null,
        error_message = null
    where sj.id in (select id from candidate)
    returning sj.id
  `;
  return rows[0] ?? null;
}

export async function renewSandboxJobLease(jobId: string, workerId: string) {
  const rows = await getSqlClient()<Array<{ id: string }>>`
    update sandbox_jobs
    set lease_expires_at = now() + make_interval(secs => ${getLeaseSeconds()})
    where id = ${jobId} and status = 'running' and locked_by = ${workerId}
    returning id
  `;
  return rows.length === 1;
}

async function finishSandboxJob(input: {
  id: string;
  workerId: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
  errorMessage?: string;
}) {
  await getDb().update(sandboxJobs).set({
    status: input.status,
    result: input.result ?? null,
    errorMessage: input.errorMessage ?? null,
    sourceCode: null,
    completedAt: new Date(),
    lockedBy: null,
    leaseExpiresAt: null,
  }).where(and(
    eq(sandboxJobs.id, input.id),
    eq(sandboxJobs.status, "running"),
    eq(sandboxJobs.lockedBy, input.workerId),
  ));
}

async function processClaimedSandboxJob(claimed: ClaimedSandboxJob, workerId: string) {
  const db = getDb();
  const job = await db.query.sandboxJobs.findFirst({
    where: and(eq(sandboxJobs.id, claimed.id), eq(sandboxJobs.lockedBy, workerId)),
    with: {
      question: {
        with: { testcases: { orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)] } },
      },
    },
  });
  if (!job) return;
  if (!job.sourceCode) {
    await finishSandboxJob({
      id: job.id,
      workerId,
      status: "failed",
      errorMessage: Messages.somethingWrong,
    });
    return;
  }

  const controller = new AbortController();
  const renewal = setInterval(() => {
    void renewSandboxJobLease(job.id, workerId).then((owned) => {
      if (!owned) controller.abort();
    }).catch(() => controller.abort());
  }, Math.max(5_000, Math.floor(getLeaseSeconds() * 1_000 / 3)));

  try {
    const language = await db.query.supportedLanguages.findFirst({
      where: enabledLanguageOptionsWhere(job.language),
    });
    if (!language) throw new AppError(Messages.languageUnavailable, 503);
    await prepareEnabledLanguageRuntime(language);

    if (job.kind === "sample") {
      const graded = await gradeCode({
        language: job.language,
        fileExtension: language.fileExtension,
        buildCommand: language.buildCommand,
        runCommand: language.runCommand,
        dockerImage: language.dockerImage,
        sourceCode: job.sourceCode,
        testcases: job.question.testcases.filter((testcase) => testcase.isSample).map((testcase) => ({
          id: testcase.id,
          name: testcase.name,
          input: testcase.input,
          expectedOutput: testcase.expectedOutput,
          isHidden: false,
          checkerType: testcase.checkerType,
          floatTolerance: testcase.floatTolerance,
        })),
        timeLimitMs: job.question.timeLimitMs,
        memoryLimitMb: job.question.memoryLimitMb,
        signal: controller.signal,
      });
      await finishSandboxJob({
        id: job.id,
        workerId,
        status: graded.infrastructureFailure ? "failed" : "completed",
        errorMessage: graded.infrastructureFailure ? graded.errorMessage ?? Messages.somethingWrong : undefined,
        result: {
          kind: "sample",
          results: graded.results.map((item) => ({
            testcaseId: item.testcaseId,
            name: item.name,
            status: item.status,
            passed: item.passed,
            runtimeMs: item.runtimeMs,
            memoryKb: item.memoryKb,
            actualOutput: item.actualOutput,
            expectedOutput: item.expectedOutput,
            errorMessage: item.errorMessage,
          })),
        },
      });
      return;
    }

    const diagnostics = await getLanguageDiagnostics({
      diagnosticsFormat: "compiler",
      diagnosticsCommand: language.diagnosticsCommand,
      dockerImage: language.dockerImage,
      fileExtension: language.fileExtension,
      sourceCode: job.sourceCode,
    });
    await finishSandboxJob({ id: job.id, workerId, status: "completed", result: { kind: "compiler_diagnostics", diagnostics } });
  } catch (error) {
    await finishSandboxJob({
      id: job.id,
      workerId,
      status: "failed",
      errorMessage: error instanceof AppError ? error.message : Messages.somethingWrong,
    });
  } finally {
    clearInterval(renewal);
  }
}

export async function processPendingSandboxJobs(limit = 1, workerId = createWorkerId()) {
  let processed = 0;
  while (processed < Math.max(1, limit)) {
    const claimed = await claimNextSandboxJob(workerId);
    if (!claimed) break;
    await processClaimedSandboxJob(claimed, workerId);
    processed += 1;
  }
  return processed;
}
