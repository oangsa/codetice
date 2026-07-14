import { paged, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageRequestFromSearchParams } from "@/lib/pagination";
import { authorizeWorkspaceSubmission, listRunResultsPage } from "@/server/submissions/queries";

export async function GET(request: Request, context: { params: Promise<{ id: string; submissionId: string; runId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, submissionId, runId } = await context.params;
    await authorizeWorkspaceSubmission(actor, workspaceId, submissionId);
    const url = new URL(request.url);
    return paged(await listRunResultsPage({
      actor,
      workspaceId,
      submissionId,
      runId,
      ...parsePageRequestFromSearchParams(url.searchParams),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
