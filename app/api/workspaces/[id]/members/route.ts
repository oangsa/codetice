import { paged, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageRequestFromSearchParams } from "@/lib/pagination";
import { listWorkspaceMembersPage } from "@/server/workspaces/queries";
import { requireWorkspaceStaff } from "@/server/workspaces/authorization";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const url = new URL(request.url);
    return paged(await listWorkspaceMembersPage({
      actor,
      workspaceId,
      ...parsePageRequestFromSearchParams(url.searchParams),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
