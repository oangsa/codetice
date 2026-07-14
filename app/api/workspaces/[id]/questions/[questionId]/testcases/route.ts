import { z } from "zod";

import { ok, paged, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageRequestFromSearchParams } from "@/lib/pagination";
import { testcaseSchema } from "@/modules/questions/schema";
import { createWorkspaceTestcase } from "@/server/questions/mutations";
import { listWorkspaceTestcases } from "@/server/questions/queries";
import { requireWorkspaceMember, requireWorkspaceStaff } from "@/server/workspaces/authorization";

export async function GET(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    await requireWorkspaceMember(actor, workspaceId);
    const url = new URL(request.url);
    return paged(await listWorkspaceTestcases({
      actor,
      workspaceId,
      questionId,
      ...parsePageRequestFromSearchParams(url.searchParams),
    }));
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
    return ok({ testcase: await createWorkspaceTestcase(actor, workspaceId, questionId, body) }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToSaveTestcase);
  }
}
