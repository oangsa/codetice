import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";
import { listWorkspaceSubmissionsPage } from "@/server/submissions/queries";

const optionalUuid = z.string().uuid().optional().nullable();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(actor, workspaceId);
    const url = new URL(request.url);
    return ok(await listWorkspaceSubmissionsPage({
      actor,
      workspaceId,
      questionId: optionalUuid.parse(url.searchParams.get("questionId")) ?? null,
      studentId: optionalUuid.parse(url.searchParams.get("studentId")) ?? null,
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.somethingWrong);
  }
}
