import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { completeRejudgeJob, processGradingJob, rejudgeQuestion } from "@/server/services/submission-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;

  let rejudgeJob: { id: string } | null = null;
  try {
    const result = await rejudgeQuestion(id, session.userId);
    rejudgeJob = result.rejudgeJob;
    const processedJobs = [];

    for (const gradingJob of result.gradingJobs) {
      processedJobs.push(await processGradingJob(gradingJob.id));
    }

    const rejudgeStatus = processedJobs.some((job) => job?.status !== "completed") ? "failed" : "completed";
    await completeRejudgeJob(rejudgeJob.id, rejudgeStatus);
    return ok({ rejudgeJob, gradingJobs: processedJobs });
  } catch (error) {
    if (rejudgeJob) {
      await completeRejudgeJob(rejudgeJob.id, "failed");
    }
    return fail(error instanceof Error ? error.message : "Unable to rejudge question.");
  }
}
