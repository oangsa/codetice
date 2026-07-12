import { ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { authorizeWorkspaceSubmission, listRunResultsPage } from "@/server/submissions/queries";

export async function GET(request: Request, context: { params: Promise<{ id: string; submissionId: string; runId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, submissionId, runId } = await context.params;
    await authorizeWorkspaceSubmission(actor, workspaceId, submissionId);
    const url = new URL(request.url);
    return ok(await listRunResultsPage({
      actor,
      workspaceId,
      submissionId,
      runId,
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
