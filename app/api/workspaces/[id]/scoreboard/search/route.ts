import { paged, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { searchWorkspaceScoreboardPage } from "@/server/scoreboard/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    return paged(await searchWorkspaceScoreboardPage({ actor, workspaceId, body: await request.json() }));
  } catch (error) {
    return toFailResponse(error);
  }
}
