import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiAdmin, requireApiUser } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { workspaceSchema } from "@/modules/workspaces/schema";
import { createWorkspace } from "@/server/workspaces/mutations";
import { listWorkspacesPage } from "@/server/workspaces/queries";

export async function GET(request: Request) {
  try {
    const actor = await requireApiUser();
    const url = new URL(request.url);
    const page = await listWorkspacesPage({
      actor,
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
      search: url.searchParams.get("q") ?? "",
    });
    return ok(page);
  } catch (error) {
    return toFailResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiAdmin();
    const parsed = workspaceSchema.parse(await request.json());
    const workspace = await createWorkspace({ actor, name: parsed.name });
    return ok({ workspace }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToCreateWorkspace);
  }
}
