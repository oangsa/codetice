import { fail, ok } from "@/lib/api";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/lib/constants";
import { getPyrightDiagnostics } from "@/lib/grader/pyright";

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

  if (!sourceCode) {
    return fail("sourceCode is required.");
  }

  if (sourceCode.length > MAX_SUBMISSION_SOURCE_CHARS) {
    return fail(`sourceCode must be at most ${MAX_SUBMISSION_SOURCE_CHARS} characters.`);
  }

  const diagnostics = await getPyrightDiagnostics(sourceCode);
  return ok({ diagnostics });
}
