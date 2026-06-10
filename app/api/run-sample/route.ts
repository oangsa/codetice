import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { runSampleSchema } from "@/lib/validations/submission";
import { runSampleSubmission } from "@/server/services/submission-service";

export async function POST(request: Request) {
  await requireUser();
  const body = await request.json();
  const parsed = runSampleSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid run-sample payload.");
  }

  try {
    const result = await runSampleSubmission(parsed.data);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to run sample tests.");
  }
}
