import { z } from "zod";

import { fail, ok, toFailResponse, Messages } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api.constants";
import { requireApiUser } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { runSampleSchema } from "@/modules/submissions/schema";
import { enqueueSampleJob } from "@/server/grading/sandbox-jobs";
import { hashIdempotencyPayload } from "@/server/security/idempotency";
import { assertRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    const body = runSampleSchema.parse(await request.json());
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
    if (!key) return fail(Messages.refreshRetry, 400);
    const identifier = await getRequestIdentifier(actor.userId);
    await assertRateLimit({ identifier, action: "run-sample", limit: 60, windowMinutes: 15 });
    const result = await enqueueSampleJob({
      actor,
      workspaceId,
      ...body,
      idempotency: {
        identifier,
        action: `workspace:${workspaceId}:run-sample`,
        key,
        requestHash: hashIdempotencyPayload(body),
      },
    });
    return ok(result, { status: 202 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToRunCode);
  }
}
