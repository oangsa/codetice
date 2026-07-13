import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { questionPublicationSchema } from "@/modules/questions/schema";
import { setWorkspaceQuestionPublication } from "@/server/questions/mutations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    const body = questionPublicationSchema.parse(await request.json());
    return ok(await setWorkspaceQuestionPublication({ actor, workspaceId, ...body }));
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToUpdateQuestion);
  }
}
