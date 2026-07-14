import { ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getWorkspaceSubmissionDetail } from "@/server/submissions/queries";

export async function GET(_request: Request, context: { params: Promise<{ id: string; submissionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, submissionId } = await context.params;
    return ok({ submission: await getWorkspaceSubmissionDetail(actor, workspaceId, submissionId) });
  } catch (error) {
    return toFailResponse(error);
  }
}
