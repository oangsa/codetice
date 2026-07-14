import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { requireWorkspaceAdmin } from "@/server/workspaces/authorization";
import { removeWorkspaceMember, updateWorkspaceMemberRole } from "@/server/workspaces/mutations";

const roleSchema = z.object({ role: z.enum(["student", "ta"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, userId } = await context.params;
    await requireWorkspaceAdmin(actor, workspaceId);
    const { role } = roleSchema.parse(await request.json());
    return ok({ membership: await updateWorkspaceMemberRole(actor, workspaceId, userId, role) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.somethingWrong);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, userId } = await context.params;
    await requireWorkspaceAdmin(actor, workspaceId);
    await removeWorkspaceMember(actor, workspaceId, userId);
    return ok({ message: "Member removed." });
  } catch (error) {
    return toFailResponse(error);
  }
}
