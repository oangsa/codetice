import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workspaceCloneSchema } from "@/modules/workspaces/schema";
import { cloneWorkspace } from "@/server/questions/cloning";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    const body = workspaceCloneSchema.parse(await request.json());
    const clone = await cloneWorkspace({ actor, workspaceId, ...body });
    return ok(clone, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToCreateWorkspace);
  }
}
