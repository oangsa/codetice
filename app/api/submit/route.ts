import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { submitSchema } from "@/lib/validations/submission";
import { submitOfficialSolution } from "@/server/services/submission-service";

export async function POST(request: Request) {
  const session = await requireUser();
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid submit payload.");
  }

  try {
    const submission = await submitOfficialSolution({
      ...parsed.data,
      userId: session.userId,
    });

    return ok({ submission, ...submission });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to submit solution.");
  }
}
