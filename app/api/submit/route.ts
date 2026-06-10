import { after } from "next/server";

import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { submitSchema } from "@/lib/validations/submission";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { enqueueOfficialSubmission, processGradingJob } from "@/server/services/submission-service";

export async function POST(request: Request) {
  const session = await requireUser();
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid submit payload.");
  }

  try {
    await assertRateLimit({
      identifier: await getRequestIdentifier(session.userId),
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

    return ok({
      submission,
      gradingJob,
      status: submission.status,
      score: submission.score,
      passedCount: submission.passedCount,
      totalCount: submission.totalCount,
      runtimeMs: submission.runtimeMs,
      errorMessage: submission.errorMessage,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to submit solution.");
  }
}
