import { requireUser } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { testcaseSchema } from "@/lib/validations/question";
import { canUserEditQuestion, deleteTestcase, getQuestionById, updateTestcase } from "@/server/services/question-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; testcaseId: string }> },
) {
  const session = await requireUser();
  const { id, testcaseId } = await context.params;

  const question = await getQuestionById(id);
  if (!question || !canUserEditQuestion(session, question)) {
    return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
  }

  const body = await request.json();
  const parsed = testcaseSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const testcase = await updateTestcase(testcaseId, parsed.data);
    return ok({ testcase });
  } catch (error) {
    return toFailResponse(error, Messages.unableToUpdateTestcase);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; testcaseId: string }> },
) {
  const session = await requireUser();
  const { id, testcaseId } = await context.params;

  const question = await getQuestionById(id);
  if (!question || !canUserEditQuestion(session, question)) {
    return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
  }

  await deleteTestcase(testcaseId);
  return ok({ success: true });
}
