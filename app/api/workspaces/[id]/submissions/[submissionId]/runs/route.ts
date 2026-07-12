import { ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { authorizeWorkspaceSubmission, listSubmissionRunsPage } from "@/server/submissions/queries";

export async function GET(request: Request, context: { params: Promise<{ id: string; submissionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, submissionId } = await context.params;
    await authorizeWorkspaceSubmission(actor, workspaceId, submissionId);
    const url = new URL(request.url);
    return ok(await listSubmissionRunsPage({
      actor,
      workspaceId,
      submissionId,
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
