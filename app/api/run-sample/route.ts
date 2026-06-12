import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/constants";
import { getRequestIdentifier } from "@/lib/request";
import { runSampleSchema } from "@/lib/validations/submission";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  hashIdempotencyPayload,
} from "@/server/services/idempotency-service";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { runSampleSubmission } from "@/server/services/submission-service";

export async function POST(request: Request) {
  const session = await requireUser();
  let idempotencyState: { kind: "fresh"; keyId: string } | null = null;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload.");
  }
  const parsed = runSampleSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid run-sample payload.");
  }

  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
  if (!idempotencyKey) {
    return fail("Missing idempotency key.", 400);
  }

  try {
    const identifier = await getRequestIdentifier(session.userId);
    const idempotency = await beginIdempotentRequest<Awaited<ReturnType<typeof runSampleSubmission>>>({
      identifier,
      action: "run-sample",
      key: idempotencyKey,
      requestHash: hashIdempotencyPayload({
        ...parsed.data,
        userId: session.userId,
      }),
    });

    if (idempotency.kind === "cached") {
      return ok(idempotency.body, { status: idempotency.status });
    }
    idempotencyState = idempotency;

    await assertRateLimit({
      identifier,
      action: "run-sample",
      limit: 60,
      windowMinutes: 15,
    });
    const result = await runSampleSubmission(parsed.data);
    await completeIdempotentRequest({
      keyId: idempotencyState.keyId,
      status: 200,
      body: result,
    });
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run sample tests.";
    const status =
      message === "A matching request is already in progress."
        ? 409
        : message === "Idempotency key was reused with a different payload."
          ? 409
          : 400;

    if (idempotencyState) {
      await completeIdempotentRequest({
        keyId: idempotencyState.keyId,
        status,
        body: { message },
      });
    }

    return fail(message, status);
  }
}
