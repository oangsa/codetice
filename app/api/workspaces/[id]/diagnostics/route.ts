import { z } from "zod";

import { supportedLanguages } from "@/db/schema";
import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { getRequestIdentifier } from "@/lib/request";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/modules/submissions/constants";
import { getLanguageDiagnostics } from "@/server/grading/language-diagnostics";
import {
  requiresPreparedRuntimeForDiagnostics,
  type DiagnosticsFormat,
} from "@/server/languages/diagnostics-readiness";
import { getWorkspaceQuestionById } from "@/server/questions/queries";
import { assertRateLimit } from "@/server/security/rate-limit";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";
import { eq } from "drizzle-orm";

const diagnosticsSchema = z.object({
  questionId: z.string().uuid(),
  language: z.string().trim().min(1).max(50),
  sourceCode: z.string().min(1).max(MAX_SUBMISSION_SOURCE_CHARS),
});

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    const access = await requireWorkspaceMember(actor, workspaceId);
    const body = diagnosticsSchema.parse(await request.json());
    const question = await getWorkspaceQuestionById(workspaceId, body.questionId);
    if (!question || (!access.staff && !question.isPublished)) {
      throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
    }
    if (question.allowedLanguages.length > 0 && !question.allowedLanguages.includes(body.language)) {
      throw new AppError(Messages.languageNotAllowed, 400, ErrorCode.VALIDATION);
    }

    const language = await getDb().query.supportedLanguages.findFirst({
      where: eq(supportedLanguages.slug, body.language),
    });
    if (!language?.isEnabled) {
      throw new AppError(Messages.languageNotSupported, 400, ErrorCode.VALIDATION);
    }
    const diagnosticsFormat = language.diagnosticsFormat as DiagnosticsFormat;
    if (requiresPreparedRuntimeForDiagnostics(diagnosticsFormat) && language.runtimeStatus !== "ready") {
      throw new AppError(Messages.languageUnavailable, 503, ErrorCode.UNAVAILABLE);
    }

    await assertRateLimit({
      identifier: await getRequestIdentifier(actor.userId),
      action: `workspace:${workspaceId}:diagnostics`,
      limit: 120,
      windowMinutes: 15,
    });
    return ok({
      diagnostics: await getLanguageDiagnostics({
        diagnosticsFormat,
        diagnosticsCommand: language.diagnosticsCommand,
        dockerImage: language.dockerImage,
        fileExtension: language.fileExtension,
        sourceCode: body.sourceCode,
      }),
    });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToComputeDiagnostics);
  }
}
