import { after } from "next/server";

import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/constants";
import { getRequestIdentifier } from "@/lib/request";
import { submitSchema } from "@/lib/validations/submission";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  hashIdempotencyPayload,
} from "@/server/services/idempotency-service";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { enqueueOfficialSubmission, processGradingJob } from "@/server/services/submission-service";

export async function POST(request: Request) {
  const session = await requireUser();
  let idempotencyState: { kind: "fresh"; keyId: string } | null = null;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload.");
  }
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid submit payload.");
  }

  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
  if (!idempotencyKey) {
    return fail("Missing idempotency key.", 400);
  }

  try {
    const identifier = await getRequestIdentifier(session.userId);
    const idempotency = await beginIdempotentRequest<{
      submission: unknown;
      gradingJob: unknown;
      status: string;
      score: string;
      passedCount: number;
      totalCount: number;
      runtimeMs: number | null;
      errorMessage: string | null;
    }>({
      identifier,
      action: "submit",
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
      action: "submit",
      limit: 30,
      windowMinutes: 15,
    });
    const { submission, gradingJob } = await enqueueOfficialSubmission({
      ...parsed.data,
      userId: session.userId,
    });

    after(async () => {
      await processGradingJob(gradingJob.id);
    });

    const responseBody = {
      submission,
      gradingJob,
      status: submission.status,
      score: submission.score,
      passedCount: submission.passedCount,
      totalCount: submission.totalCount,
      runtimeMs: submission.runtimeMs,
      errorMessage: submission.errorMessage,
    };

    await completeIdempotentRequest({
      keyId: idempotencyState.keyId,
      status: 200,
      body: responseBody,
    });

    return ok(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit solution.";
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
