import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { requireWorkspaceAdmin } from "@/server/workspaces/authorization";
import {
  deleteWorkspace,
  updateWorkspace,
} from "@/server/workspaces/mutations";
import { getWorkspaceDetail } from "@/server/workspaces/queries";

const workspaceIdSchema = z.string().uuid();
const updateSchema = z.object({ name: z.string().trim().min(1).max(255) });

async function getId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return workspaceIdSchema.parse(id);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const workspaceId = await getId(context);
    return ok({ workspace: await getWorkspaceDetail(actor, workspaceId) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.workspaceNotFound : Messages.somethingWrong);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const workspaceId = await getId(context);
    await requireWorkspaceAdmin(actor, workspaceId);
    const body = updateSchema.parse(await request.json());
    return ok({ workspace: await updateWorkspace(actor, workspaceId, body.name) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.somethingWrong);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const workspaceId = await getId(context);
    await requireWorkspaceAdmin(actor, workspaceId);
    await deleteWorkspace(actor, workspaceId);
    return ok({ message: "Workspace deleted." });
  } catch (error) {
    return toFailResponse(error);
  }
}
