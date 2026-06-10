import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { processPendingGradingJobs, rejudgeQuestion } from "@/server/services/submission-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;

  try {
    const rejudgeJob = await rejudgeQuestion(id, session.userId);
    await processPendingGradingJobs(50);
    return ok({ rejudgeJob });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to rejudge question.");
  }
}
