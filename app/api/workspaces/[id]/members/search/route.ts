import { ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { searchWorkspaceMembersPage } from "@/server/workspaces/queries";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    return ok(await searchWorkspaceMembersPage({ actor, workspaceId, body: await request.json() }));
  } catch (error) {
    return toFailResponse(error);
  }
}
