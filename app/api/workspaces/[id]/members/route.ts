import { ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { requireWorkspaceStaff } from "@/server/workspaces/authorization";
import { listWorkspaceMembersPage } from "@/server/workspaces/queries";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const url = new URL(request.url);
    return ok(await listWorkspaceMembersPage({
      workspaceId,
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
