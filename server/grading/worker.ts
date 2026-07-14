import "server-only";

import os from "node:os";

import { and, eq, sql } from "drizzle-orm";

import { gradingJobs, rejudgeJobs, submissionRuns, submissions } from "@/db/schema";
import { getDb, getSqlClient } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { DEFAULT_GRADING_JOB_LEASE_SECONDS } from "@/server/grading/constants";
import { persistRunResult, type GradingResult } from "@/server/grading/run-persistence";
import { gradeCode } from "@/server/grading/service";
import { enabledLanguageOptionsWhere } from "@/server/languages/options";
import { prepareEnabledLanguageRuntime } from "@/server/languages/runtime-preparation.server";

type ClaimedJob = { id: string; submission_run_id: string; submission_id: string };

function createWorkerId(scope = "worker") {
  return `${scope}:${os.hostname()}:${process.pid}`;
}

function getJobLeaseSeconds() {
  const configured = Number(process.env.GRADING_JOB_LEASE_SECONDS ?? DEFAULT_GRADING_JOB_LEASE_SECONDS);
  return Number.isFinite(configured) ? Math.max(60, Math.floor(configured)) : DEFAULT_GRADING_JOB_LEASE_SECONDS;
}

async function claimNextGradingJob(workerId: string) {
  const client = getSqlClient();
  const leaseSeconds = getJobLeaseSeconds();
  const rows = await client<ClaimedJob[]>`
    with candidate as (
      select id
      from grading_jobs
      where status = 'queued'
         or (status = 'running' and completed_at is null and lease_expires_at < now())
      order by created_at asc, id asc
      for update skip locked
      limit 1
    )
    update grading_jobs gj
    set status = 'running',
        attempts = gj.attempts + 1,
        locked_by = ${workerId},
        lease_expires_at = now() + make_interval(secs => ${leaseSeconds}),
        started_at = coalesce(gj.started_at, now()),
        completed_at = null,
        error_message = null
    where gj.id in (select id from candidate)
    returning gj.id, gj.submission_run_id, gj.submission_id
  `;
  return rows[0] ?? null;
}

async function claimGradingJobById(jobId: string, workerId: string) {
  const client = getSqlClient();
  const leaseSeconds = getJobLeaseSeconds();
  const rows = await client<ClaimedJob[]>`
    update grading_jobs
    set status = 'running', attempts = attempts + 1, locked_by = ${workerId},
        lease_expires_at = now() + make_interval(secs => ${leaseSeconds}),
        started_at = coalesce(started_at, now()), completed_at = null, error_message = null
    where id = ${jobId}
      and (status = 'queued' or (status = 'running' and completed_at is null and lease_expires_at < now()))
    returning id, submission_run_id, submission_id
  `;
  return rows[0] ?? null;
}

async function renewJobLease(jobId: string, workerId: string) {
  const client = getSqlClient();
  const rows = await client<Array<{ id: string }>>`
    update grading_jobs
    set lease_expires_at = now() + make_interval(secs => ${getJobLeaseSeconds()})
    where id = ${jobId} and status = 'running' and locked_by = ${workerId}
    returning id
  `;
  return rows.length === 1;
}

async function processClaimedGradingJob(claimed: ClaimedJob, workerId: string) {
  const db = getDb();
  const job = await db.query.gradingJobs.findFirst({
    where: and(eq(gradingJobs.id, claimed.id), eq(gradingJobs.lockedBy, workerId)),
    with: {
      submission: {
        with: {
          question: {
            with: { testcases: { orderBy: (fields, ops) => [ops.asc(fields.sortOrder), ops.asc(fields.createdAt)] } },
          },
        },
      },
    },
  });
  if (!job) throw new AppError(Messages.gradingJobNotFound, 404, ErrorCode.NOT_FOUND);

  await db.transaction(async (tx) => {
    await tx.update(submissionRuns).set({ status: "running", startedAt: new Date() }).where(eq(submissionRuns.id, job.submissionRunId));
    await tx.update(submissions).set({ status: "running" }).where(and(
      eq(submissions.id, job.submissionId),
      eq(submissions.latestRunId, job.submissionRunId),
    ));
    if (job.rejudgeJobId) {
      await tx.update(rejudgeJobs).set({ status: "running", startedAt: sql`coalesce(${rejudgeJobs.startedAt}, now())` })
        .where(and(eq(rejudgeJobs.id, job.rejudgeJobId), eq(rejudgeJobs.status, "queued")));
    }
  });

  const controller = new AbortController();
  const renewalMs = Math.max(5_000, Math.floor(getJobLeaseSeconds() * 1_000 / 3));
  const renewal = setInterval(() => {
    void renewJobLease(job.id, workerId).then((owned) => {
      if (!owned) controller.abort();
    }).catch(() => controller.abort());
  }, renewalMs);

  try {
    const language = await db.query.supportedLanguages.findFirst({
      where: enabledLanguageOptionsWhere(job.submission.language),
    });
    if (!language) throw new AppError(Messages.languageUnavailable, 503, ErrorCode.UNAVAILABLE);
    await prepareEnabledLanguageRuntime(language);

    const graded = await gradeCode({
      language: job.submission.language,
      fileExtension: language.fileExtension,
      buildCommand: language.buildCommand,
      runCommand: language.runCommand,
      dockerImage: language.dockerImage,
      sourceCode: job.submission.sourceCode,
      testcases: job.submission.question.testcases.map((testcase) => ({
        id: testcase.id,
        name: testcase.name,
        input: testcase.input,
        expectedOutput: testcase.expectedOutput,
        isHidden: testcase.isHidden,
        checkerType: testcase.checkerType,
        floatTolerance: testcase.floatTolerance,
      })),
      timeLimitMs: job.submission.question.timeLimitMs,
      memoryLimitMb: job.submission.question.memoryLimitMb,
      signal: controller.signal,
    });
    await persistRunResult({
      jobId: job.id,
      workerId,
      runId: job.submissionRunId,
      submissionId: job.submissionId,
      results: graded.results,
      totalScore: Number(job.submission.question.totalScore),
      infrastructureFailure: graded.infrastructureFailure,
      runError: graded.errorMessage,
    });
  } catch (error) {
    const message = error instanceof AppError ? error.message : Messages.somethingWrong;
    const synthetic: GradingResult[] = job.submission.question.testcases.map((testcase) => ({
      testcaseId: testcase.id,
      name: testcase.name,
      status: "internal_error",
      passed: false,
      runtimeMs: null,
      memoryKb: null,
      actualOutput: null,
      expectedOutput: testcase.expectedOutput,
      errorMessage: message,
      isHidden: testcase.isHidden,
      infrastructureFailure: true,
    }));
    await persistRunResult({
      jobId: job.id,
      workerId,
      runId: job.submissionRunId,
      submissionId: job.submissionId,
      results: synthetic,
      totalScore: Number(job.submission.question.totalScore),
      infrastructureFailure: true,
      runError: message,
    });
  } finally {
    clearInterval(renewal);
  }
}

export async function processGradingJob(jobId: string, workerId = createWorkerId("direct")) {
  const claimed = await claimGradingJobById(jobId, workerId);
  if (!claimed) return getDb().query.gradingJobs.findFirst({ where: eq(gradingJobs.id, jobId) });
  await processClaimedGradingJob(claimed, workerId);
  return getDb().query.gradingJobs.findFirst({ where: eq(gradingJobs.id, jobId) });
}

export async function processPendingGradingJobs(limit = 10, workerId = createWorkerId()) {
  let processed = 0;
  while (processed < Math.max(1, limit)) {
    const claimed = await claimNextGradingJob(workerId);
    if (!claimed) break;
    await processClaimedGradingJob(claimed, workerId);
    processed += 1;
  }
  return processed;
}
