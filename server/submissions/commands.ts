import "server-only";

import { and, eq } from "drizzle-orm";

import {
  gradingJobs,
  questions,
  submissionRuns,
  submissions,
  testcases,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { gradeCode } from "@/server/grading/service";
import { enabledLanguageOptionsWhere } from "@/server/languages/options";
import { executeIdempotentMutation } from "@/server/security/idempotency";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";

type Db = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

function parseAllowedLanguages(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function assertLanguageAllowed(question: { allowedLanguages: string | null }, language: string) {
  const allowed = parseAllowedLanguages(question.allowedLanguages);
  if (allowed.length > 0 && !allowed.includes(language)) {
    throw new AppError(Messages.languageNotAllowed, 400, ErrorCode.VALIDATION);
  }
}

async function loadEnabledLanguage(slug: string) {
  const db = getDb();
  const language = await db.query.supportedLanguages.findFirst({
    where: enabledLanguageOptionsWhere(slug),
  });
  if (!language) throw new AppError(Messages.languageUnavailable, 400, ErrorCode.VALIDATION);
  return language;
}

export async function runSampleSubmission(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  sourceCode: string;
  language: string;
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const db = getDb();
  const [question, language] = await Promise.all([
    db.query.questions.findFirst({
      where: and(
        eq(questions.id, input.questionId),
        eq(questions.workspaceId, input.workspaceId),
        access.staff ? undefined : eq(questions.isPublished, true),
      ),
      with: { testcases: { where: eq(testcases.isSample, true) } },
    }),
    loadEnabledLanguage(input.language),
  ]);
  if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
  assertLanguageAllowed(question, input.language);

  const graded = await gradeCode({
    language: input.language,
    fileExtension: language.fileExtension,
    buildCommand: language.buildCommand,
    runCommand: language.runCommand,
    dockerImage: language.dockerImage,
    sourceCode: input.sourceCode,
    testcases: question.testcases.map((testcase) => ({
      id: testcase.id,
      name: testcase.name,
      input: testcase.input,
      expectedOutput: testcase.expectedOutput,
      isHidden: false,
      checkerType: testcase.checkerType,
      floatTolerance: testcase.floatTolerance,
    })),
    timeLimitMs: question.timeLimitMs,
    memoryLimitMb: question.memoryLimitMb,
  });

  return {
    questionId: question.id,
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
      isHidden: item.isHidden,
    })),
  };
}

export async function enqueueOfficialSubmission(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  questionId: string;
  sourceCode: string;
  language: string;
  idempotency?: {
    identifier: string;
    action: string;
    key: string;
    requestHash: string;
  };
}) {
  const access = await requireWorkspaceMember(input.actor, input.workspaceId);
  const db = getDb();
  const submissionId = crypto.randomUUID();
  const runId = crypto.randomUUID();

  const mutate = async (tx: Transaction) => {
    const question = await tx.query.questions.findFirst({
      where: and(
        eq(questions.id, input.questionId),
        eq(questions.workspaceId, input.workspaceId),
        access.staff ? undefined : eq(questions.isPublished, true),
      ),
      with: { testcases: { columns: { id: true } } },
    });
    if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
    if (question.testcases.length === 0) throw new AppError(Messages.questionNotReady, 400, ErrorCode.VALIDATION);
    assertLanguageAllowed(question, input.language);

    const language = await tx.query.supportedLanguages.findFirst({
      where: enabledLanguageOptionsWhere(input.language),
      columns: { id: true },
    });
    if (!language) throw new AppError(Messages.languageUnavailable, 400, ErrorCode.VALIDATION);

    const [submission] = await tx.insert(submissions).values({
      id: submissionId,
      userId: input.actor.userId,
      questionId: question.id,
      language: input.language,
      sourceCode: input.sourceCode,
      status: "queued",
      isRanked: !access.staff,
      latestRunId: runId,
    }).returning();
    await tx.insert(submissionRuns).values({
      id: runId,
      submissionId,
      sequence: 1,
      trigger: "official",
      status: "queued",
      requestedBy: input.actor.userId,
    });
    const [gradingJob] = await tx.insert(gradingJobs).values({
      submissionId,
      submissionRunId: runId,
      status: "queued",
    }).returning();

    return { submission: submission!, gradingJob: gradingJob! };
  };

  return input.idempotency
    ? executeIdempotentMutation({ ...input.idempotency, responseStatus: 202, mutate })
    : db.transaction(mutate);
}
