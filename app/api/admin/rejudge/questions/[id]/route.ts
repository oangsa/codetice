import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { completeRejudgeJob, processPendingGradingJobs, rejudgeQuestion } from "@/server/services/submission-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;

  let rejudgeJob: { id: string } | null = null;
  try {
    rejudgeJob = await rejudgeQuestion(id, session.userId);
    await processPendingGradingJobs(50);
    await completeRejudgeJob(rejudgeJob.id, "completed");
    return ok({ rejudgeJob });
  } catch (error) {
    if (rejudgeJob) {
      await completeRejudgeJob(rejudgeJob.id, "failed");
    }
    return fail(error instanceof Error ? error.message : "Unable to rejudge question.");
  }
}
