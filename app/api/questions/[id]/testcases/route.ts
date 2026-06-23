import { requireUser } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok } from "@/lib/api";
import { testcaseSchema } from "@/lib/validations/question";
import { canUserEditQuestion, createTestcase, getQuestionById } from "@/server/services/question-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;

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

  const testcase = await createTestcase(id, parsed.data);
  return ok({ testcase });
}
