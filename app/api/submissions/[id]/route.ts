import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getSubmissionDetail } from "@/server/services/submission-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;

  const submission = await getSubmissionDetail(id, session.userId, session.role);

  if (!submission) {
    return fail("Submission not found.", 404);
  }

  return ok({ submission });
}
