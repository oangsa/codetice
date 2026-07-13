import { z } from "zod";

import { ok, paged, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageRequestFromSearchParams } from "@/lib/pagination";
import { questionWithTestcasesSchema } from "@/modules/questions/schema";
import { createWorkspaceQuestion } from "@/server/questions/mutations";
import { listWorkspaceQuestionsPage, parseWorkspaceQuestionTagIds } from "@/server/questions/queries";
import { requireWorkspaceMember, requireWorkspaceStaff } from "@/server/workspaces/authorization";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(actor, workspaceId);
    const url = new URL(request.url);
    return paged(await listWorkspaceQuestionsPage({
      actor,
      workspaceId,
      ...parsePageRequestFromSearchParams(url.searchParams),
      tagIds: parseWorkspaceQuestionTagIds(url.searchParams.getAll("tagId")),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const body = questionWithTestcasesSchema.parse(await request.json());
    const question = await createWorkspaceQuestion({
      actor,
      workspaceId,
      question: body,
      testcases: body.testcases,
    });
    return ok({ question }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToCreateQuestion);
  }
}
