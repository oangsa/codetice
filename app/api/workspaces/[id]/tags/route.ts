import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workspaceTagSchema } from "@/modules/tags/schema";
import { createWorkspaceTag, listWorkspaceTags } from "@/server/tags/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    return ok({ tags: await listWorkspaceTags(actor, workspaceId) });
  } catch (error) {
    return toFailResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    const body = workspaceTagSchema.parse(await request.json());
    return ok({ tag: await createWorkspaceTag({ actor, workspaceId, name: body.name }) }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.somethingWrong);
  }
}
