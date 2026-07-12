import { z } from "zod";

import { fail, ok, toFailResponse, Messages } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api.constants";
import { requireApiUser } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { submitSchema } from "@/modules/submissions/schema";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";
import {
  cacheIdempotentFailureResponse,
  getCompletedIdempotentResponse,
  hashIdempotencyPayload,
  type IdempotencyRequest,
} from "@/server/security/idempotency";
import { assertRateLimit } from "@/server/security/rate-limit";
import { enqueueOfficialSubmission } from "@/server/submissions/commands";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let idempotency: IdempotencyRequest | null = null;
  let shouldCacheFailure = false;
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(actor, workspaceId);
    const body = submitSchema.parse(await request.json());
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
    if (!key) return fail(Messages.refreshRetry, 400);
    const identifier = await getRequestIdentifier(actor.userId);
    idempotency = {
      identifier,
      action: `workspace:${workspaceId}:submit`,
      key,
      requestHash: hashIdempotencyPayload({ ...body, userId: actor.userId }),
    };
    const cached = await getCompletedIdempotentResponse<Awaited<ReturnType<typeof enqueueOfficialSubmission>>>(idempotency);
    if (cached) return ok(cached.body, { status: cached.status });
    shouldCacheFailure = true;
    await assertRateLimit({ identifier, action: "submit", limit: 30, windowMinutes: 15 });
    const result = await enqueueOfficialSubmission({ actor, workspaceId, ...body, idempotency });
    return ok(result, { status: 202 });
  } catch (error) {
    const response = toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToSubmit);
    if (idempotency && shouldCacheFailure) {
      await cacheIdempotentFailureResponse({
        ...idempotency,
        status: response.status,
        body: await response.clone().json(),
      });
    }
    return response;
  }
}
