import { fail, ok, toFailResponse, Messages } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api.constants";
import { requireApiUser } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { requireWorkspaceStaff } from "@/server/workspaces/authorization";
import {
  cacheIdempotentFailureResponse,
  getCompletedIdempotentResponse,
  hashIdempotencyPayload,
  type IdempotencyRequest,
} from "@/server/security/idempotency";
import { assertRateLimit } from "@/server/security/rate-limit";
import { rejudgeQuestion } from "@/server/submissions/rejudge";

export async function POST(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  let idempotency: IdempotencyRequest | null = null;
  let shouldCacheFailure = false;
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
    if (!key) return fail(Messages.refreshRetry, 400);
    const identifier = await getRequestIdentifier(actor.userId);
    idempotency = {
      identifier,
      action: `workspace:${workspaceId}:rejudge-question`,
      key,
      requestHash: hashIdempotencyPayload({ questionId }),
    };
    const cached = await getCompletedIdempotentResponse<Awaited<ReturnType<typeof rejudgeQuestion>>>(idempotency);
    if (cached) return ok(cached.body, { status: cached.status });
    shouldCacheFailure = true;
    await assertRateLimit({ identifier, action: `rejudge-question:${workspaceId}`, limit: 5, windowMinutes: 15 });
    const result = await rejudgeQuestion({ actor, workspaceId, questionId, idempotency });
    return ok(result, { status: 202 });
  } catch (error) {
    const response = toFailResponse(error, Messages.unableToRejudge);
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
