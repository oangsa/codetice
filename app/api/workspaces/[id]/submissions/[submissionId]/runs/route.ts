import { paged, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageRequestFromSearchParams } from "@/lib/pagination";
import { authorizeWorkspaceSubmission, listSubmissionRunsPage } from "@/server/submissions/queries";

export async function GET(request: Request, context: { params: Promise<{ id: string; submissionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, submissionId } = await context.params;
    await authorizeWorkspaceSubmission(actor, workspaceId, submissionId);
    const url = new URL(request.url);
    return paged(await listSubmissionRunsPage({
      actor,
      workspaceId,
      submissionId,
      ...parsePageRequestFromSearchParams(url.searchParams),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
