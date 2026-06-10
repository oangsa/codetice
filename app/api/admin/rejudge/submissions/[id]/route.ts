import { after } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { processGradingJob, rejudgeSubmission } from "@/server/services/submission-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;

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
