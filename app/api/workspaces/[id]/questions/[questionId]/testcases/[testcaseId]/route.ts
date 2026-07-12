import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { testcaseSchema } from "@/modules/questions/schema";
import { requireWorkspaceStaff } from "@/server/workspaces/authorization";
import { deleteWorkspaceTestcase, updateWorkspaceTestcase } from "@/server/questions/mutations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; questionId: string; testcaseId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId, testcaseId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const body = testcaseSchema.parse(await request.json());
    return ok({ testcase: await updateWorkspaceTestcase(workspaceId, questionId, testcaseId, body) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToUpdateTestcase);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; questionId: string; testcaseId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId, testcaseId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    await deleteWorkspaceTestcase(workspaceId, questionId, testcaseId);
    return ok({ message: "Testcase deleted." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToDeleteTestcase);
  }
}
