import { requireUser } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok } from "@/lib/api";
import { getSubmissionDetail } from "@/server/services/submission-service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return fail(Messages.submissionNotFound, 400, { code: ErrorCode.VALIDATION });
  }

  const submission = await getSubmissionDetail(id, session.userId, session.role);

  if (!submission) {
    return fail(Messages.submissionNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  return ok({ submission });
}
