import { requireAdmin } from "@/lib/auth";
import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { rejudgeSubmission } from "@/server/services/submission-service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return fail(Messages.submissionNotFound, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const { rejudgeJob, gradingJob } = await rejudgeSubmission(id, session.userId);

    return ok({ rejudgeJob, gradingJob });
  } catch (error) {
    return toFailResponse(error, Messages.unableToRejudge);
  }
}
