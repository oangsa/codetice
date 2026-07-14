import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getSandboxJob } from "@/server/grading/sandbox-jobs";

export async function GET(_request: Request, context: { params: Promise<{ id: string; jobId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, jobId: rawJobId } = await context.params;
    const jobId = z.string().uuid().parse(rawJobId);
    return ok({ job: await getSandboxJob({ actor, workspaceId, jobId }) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.somethingWrong);
  }
}
