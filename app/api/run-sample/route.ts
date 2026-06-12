import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { runSampleSchema } from "@/lib/validations/submission";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { runSampleSubmission } from "@/server/services/submission-service";

export async function POST(request: Request) {
  const session = await requireUser();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload.");
  }
  const parsed = runSampleSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid run-sample payload.");
  }

  try {
    await assertRateLimit({
      identifier: await getRequestIdentifier(session.userId),
      action: "run-sample",
      limit: 60,
      windowMinutes: 15,
    });
    const result = await runSampleSubmission(parsed.data);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to run sample tests.");
  }
}
