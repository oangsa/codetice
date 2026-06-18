import { eq } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getLanguageDiagnostics } from "@/lib/grader/language-diagnostics";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload.");
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
    return fail("sourceCode is required.");
  }

  if (!languageSlug) {
    return fail("language is required.");
  }

  if (sourceCode.length > MAX_SUBMISSION_SOURCE_CHARS) {
    return fail(`sourceCode must be at most ${MAX_SUBMISSION_SOURCE_CHARS} characters.`);
  }

  const db = getDb();
  const language = await db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.slug, languageSlug),
  });

  if (!language || !language.isEnabled) {
    return fail("Language not supported.", 404);
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
    return fail(error instanceof Error ? error.message : "Unable to compute diagnostics.", 400);
  }
}
