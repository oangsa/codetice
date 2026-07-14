import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workspaceTagSchema } from "@/modules/tags/schema";
import { deleteWorkspaceTag, updateWorkspaceTag } from "@/server/tags/service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; tagId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, tagId } = await context.params;
    const body = workspaceTagSchema.parse(await request.json());
    return ok({ tag: await updateWorkspaceTag({ actor, workspaceId, tagId, name: body.name }) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.somethingWrong);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; tagId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, tagId } = await context.params;
    await deleteWorkspaceTag({ actor, workspaceId, tagId });
    return ok({ message: "Tag deleted." });
  } catch (error) {
    return toFailResponse(error, Messages.somethingWrong);
  }
}
