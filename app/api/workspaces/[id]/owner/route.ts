import { z } from "zod";

import { Messages, ok, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workspaceOwnerSchema } from "@/modules/workspaces/schema";
import { transferWorkspaceOwnership } from "@/server/workspaces/mutations";

const workspaceIdSchema = z.string().uuid();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const workspaceId = workspaceIdSchema.parse(id);
    const { ownerId } = workspaceOwnerSchema.parse(await request.json());
    return ok({ workspace: await transferWorkspaceOwnership(actor, workspaceId, ownerId) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToTransferWorkspaceOwnership);
  }
}
