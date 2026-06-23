import { eq } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getLanguageDiagnostics } from "@/lib/grader/language-diagnostics";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/lib/submission.constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }

  const sourceCode =
    typeof (body as { sourceCode?: unknown })?.sourceCode === "string"
      ? (body as { sourceCode: string }).sourceCode
      : null;
  const languageSlug =
    typeof (body as { language?: unknown })?.language === "string"
      ? (body as { language: string }).language
      : null;

  if (!sourceCode) {
    return fail(Messages.codeRequired, 400, { code: ErrorCode.VALIDATION });
  }

  if (!languageSlug) {
    return fail(Messages.languageRequired, 400, { code: ErrorCode.VALIDATION });
  }

  if (sourceCode.length > MAX_SUBMISSION_SOURCE_CHARS) {
    return fail(Messages.codeTooLong(MAX_SUBMISSION_SOURCE_CHARS), 400, { code: ErrorCode.VALIDATION });
  }

  const db = getDb();
  const language = await db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.slug, languageSlug),
  });

  if (!language || !language.isEnabled) {
    return fail(Messages.languageNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  try {
    const diagnostics = await getLanguageDiagnostics({
      diagnosticsFormat: language.diagnosticsFormat as "none" | "pyright" | "compiler",
      diagnosticsCommand: language.diagnosticsCommand,
      dockerImage: language.dockerImage,
      fileExtension: language.fileExtension,
      sourceCode,
    });

    return ok({ diagnostics });
  } catch (error) {
    return toFailResponse(error, Messages.unableToComputeDiagnostics);
  }
}
