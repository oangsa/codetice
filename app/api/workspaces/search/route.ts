import { ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parseCollectionSearch } from "@/lib/collection-search";
import {
  searchWorkspacesPage,
  workspaceSearchConfig,
} from "@/server/workspaces/queries";

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const search = parseCollectionSearch(await request.json(), workspaceSearchConfig);
    return ok(await searchWorkspacesPage({ actor, search }));
  } catch (error) {
    return toFailResponse(error);
  }
}
