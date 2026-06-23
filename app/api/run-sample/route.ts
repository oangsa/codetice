import { requireUser } from "@/lib/auth";
import { fail, ok, Messages, ErrorCode } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api.constants";
import { getRequestIdentifier } from "@/lib/request";
import { runSampleSchema } from "@/lib/validations/submission";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  hashIdempotencyPayload,
} from "@/server/services/idempotency-service";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { runSampleSubmission } from "@/server/services/submission-service";
import { toErrorInfo } from "@/lib/errors";

export async function POST(request: Request) {
  const session = await requireUser();
  let idempotencyState: { kind: "fresh"; keyId: string } | null = null;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }
  const parsed = runSampleSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
  if (!idempotencyKey) {
    return fail(Messages.refreshRetry, 400, { code: ErrorCode.VALIDATION });
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
    const { message, status, code } = toErrorInfo(error, Messages.unableToRunCode);

    if (idempotencyState) {
      await completeIdempotentRequest({
        keyId: idempotencyState.keyId,
        status,
        body: { message, code },
      });
    }

    return fail(message, status, { code });
  }
}
