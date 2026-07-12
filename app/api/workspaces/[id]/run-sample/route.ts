import { z } from "zod";

import { fail, ok, toFailResponse, Messages } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api.constants";
import { requireApiUser } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { runSampleSchema } from "@/modules/submissions/schema";
import { requireWorkspaceMember } from "@/server/workspaces/authorization";
import { beginIdempotentRequest, completeIdempotentRequest, hashIdempotencyPayload } from "@/server/security/idempotency";
import { assertRateLimit } from "@/server/security/rate-limit";
import { runSampleSubmission } from "@/server/submissions/commands";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let reservation: { keyId: string } | null = null;
  try {
    const actor = await requireApiUser();
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(actor, workspaceId);
    const body = runSampleSchema.parse(await request.json());
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
    if (!key) return fail(Messages.refreshRetry, 400);
    const identifier = await getRequestIdentifier(actor.userId);
    const state = await beginIdempotentRequest<Awaited<ReturnType<typeof runSampleSubmission>>>({
      identifier,
      action: `workspace:${workspaceId}:run-sample`,
      key,
      requestHash: hashIdempotencyPayload(body),
    });
    if (state.kind === "cached") return ok(state.body, { status: state.status });
    reservation = { keyId: state.keyId };
    await assertRateLimit({ identifier, action: "run-sample", limit: 60, windowMinutes: 15 });
    const result = await runSampleSubmission({ actor, workspaceId, ...body });
    await completeIdempotentRequest({ keyId: state.keyId, status: 200, body: result });
    return ok(result);
  } catch (error) {
    if (reservation) {
      const response = toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToRunCode);
      const body = await response.clone().json();
      await completeIdempotentRequest({ keyId: reservation.keyId, status: response.status, body });
      return response;
    }
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToRunCode);
  }
}
