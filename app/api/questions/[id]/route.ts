import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { questionSchema } from "@/lib/validations/question";
import { canUserEditQuestion, deleteQuestion, getQuestionById, updateQuestion } from "@/server/services/question-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail("Question not found.", 404);
  }

  if (!canUserEditQuestion(session, question)) {
    return fail("Forbidden.", 403);
  }

  return ok({ question });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail("Question not found.", 404);
  }

  if (!canUserEditQuestion(session, question)) {
    return fail("Forbidden.", 403);
  }

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid question payload.");
  }

  try {
    const updated = await updateQuestion(id, parsed.data);
    return ok({ question: updated });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to update question.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail("Question not found.", 404);
  }

  if (!canUserEditQuestion(session, question)) {
    return fail("Forbidden.", 403);
  }

  await deleteQuestion(id);
  return ok({ success: true });
}

