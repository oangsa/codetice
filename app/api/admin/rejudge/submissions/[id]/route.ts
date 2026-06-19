import { after } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { processGradingJob, rejudgeSubmission } from "@/server/services/submission-service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return fail("Invalid submission ID.", 400);
  }

  try {
    const { rejudgeJob, gradingJob } = await rejudgeSubmission(id, session.userId);

    after(async () => {
      await processGradingJob(gradingJob.id);
    });

    return ok({ rejudgeJob, gradingJob });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to rejudge submission.");
  }
}
