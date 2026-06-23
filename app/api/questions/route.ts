import { getSession, requireAdmin } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { questionSchema } from "@/lib/validations/question";
import { createQuestion, listQuestionsForUser } from "@/server/services/question-service";

export async function GET() {
  const session = await getSession();
  const questions = await listQuestionsForUser(session);
  return ok({ questions });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  const body = await request.json();
  const parsed = questionSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const question = await createQuestion({
      ...parsed.data,
      createdBy: session.userId,
    });
    return ok({ question });
  } catch (error) {
    return toFailResponse(error, Messages.unableToCreateQuestion);
  }
}
