import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { joinWorkspaceSchema } from "@/modules/workspaces/schema";
import { joinWorkspace } from "@/server/workspaces/mutations";

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const body = joinWorkspaceSchema.parse(await request.json());
    return ok({ workspace: await joinWorkspace(actor, body.inviteCode) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidInviteCode : Messages.unableToJoinWorkspace);
  }
}
