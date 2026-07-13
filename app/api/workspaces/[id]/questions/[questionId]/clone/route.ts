import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { cloneQuestionSchema } from "@/modules/questions/schema";
import { cloneWorkspaceQuestion } from "@/server/questions/cloning";

export async function POST(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    const body = cloneQuestionSchema.parse(await request.json());
    const question = await cloneWorkspaceQuestion({
      actor,
      workspaceId,
      questionId,
      targetWorkspaceId: body.targetWorkspaceId,
      isPublished: body.isPublished,
    });
    return ok({ question }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToCreateQuestion);
  }
}
