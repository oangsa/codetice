import { ErrorCode, Messages, fail, ok } from "@/lib/api";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/lib/submission.constants";
import { getPyrightDiagnostics } from "@/lib/grader/pyright";

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

  if (!sourceCode) {
    return fail(Messages.codeRequired, 400, { code: ErrorCode.VALIDATION });
  }

  if (sourceCode.length > MAX_SUBMISSION_SOURCE_CHARS) {
    return fail(Messages.codeTooLong(MAX_SUBMISSION_SOURCE_CHARS), 400, { code: ErrorCode.VALIDATION });
  }

  const diagnostics = await getPyrightDiagnostics(sourceCode);
  return ok({ diagnostics });
}
