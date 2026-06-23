import { requireUser } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { questionSchema } from "@/lib/validations/question";
import { canUserEditQuestion, deleteQuestion, getQuestionById, updateQuestion } from "@/server/services/question-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail(Messages.questionNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  if (!canUserEditQuestion(session, question)) {
    return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
  }

  return ok({ question });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail(Messages.questionNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  if (!canUserEditQuestion(session, question)) {
    return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
  }

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const updated = await updateQuestion(id, parsed.data);
    return ok({ question: updated });
  } catch (error) {
    return toFailResponse(error, Messages.unableToUpdateQuestion);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail(Messages.questionNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  if (!canUserEditQuestion(session, question)) {
    return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
  }

  await deleteQuestion(id);
  return ok({ success: true });
}

