import { fail, ok } from "@/lib/api";
import { getPyrightDiagnostics } from "@/lib/grader/pyright";

export async function POST(request: Request) {
  const body = (await request.json()) as { sourceCode?: string };
  if (!body.sourceCode) {
    return fail("sourceCode is required.");
  }

  const diagnostics = await getPyrightDiagnostics(body.sourceCode);
  return ok({ diagnostics });
}
