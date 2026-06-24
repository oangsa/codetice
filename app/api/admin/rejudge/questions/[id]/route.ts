import { requireAdmin } from "@/lib/auth";
import { ok, toFailResponse, Messages } from "@/lib/api";
import { rejudgeQuestion } from "@/server/services/submission-service";

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
    return ok({ rejudgeJob, gradingJobs: result.gradingJobs });
  } catch (error) {
    return toFailResponse(error, Messages.unableToRejudge);
  }
}
