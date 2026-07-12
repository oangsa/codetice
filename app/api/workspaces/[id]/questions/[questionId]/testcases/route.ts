import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { testcaseSchema } from "@/modules/questions/schema";
import { requireWorkspaceMember, requireWorkspaceStaff } from "@/server/workspaces/authorization";
import { createWorkspaceTestcase } from "@/server/questions/mutations";
import { listWorkspaceTestcases } from "@/server/questions/queries";

export async function GET(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    const access = await requireWorkspaceMember(actor, workspaceId);
    const url = new URL(request.url);
    return ok(await listWorkspaceTestcases(
      workspaceId,
      questionId,
      access.staff,
      parsePageLimit(url.searchParams.get("limit")),
      url.searchParams.get("cursor"),
    ));
  } catch (error) {
    return toFailResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const body = testcaseSchema.parse(await request.json());
    return ok({ testcase: await createWorkspaceTestcase(workspaceId, questionId, body) }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToSaveTestcase);
  }
}
