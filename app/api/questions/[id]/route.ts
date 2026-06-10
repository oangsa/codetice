import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { questionSchema } from "@/lib/validations/question";
import { deleteQuestion, getQuestionById, updateQuestion } from "@/server/services/question-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail("Question not found.", 404);
  }

  return ok({ question });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json();
  const parsed = questionSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid question payload.");
  }

  try {
    const question = await updateQuestion(id, parsed.data);
    return ok({ question });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to update question.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await context.params;
  await deleteQuestion(id);
  return ok({ success: true });
}
