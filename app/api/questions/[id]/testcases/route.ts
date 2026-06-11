import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { testcaseSchema } from "@/lib/validations/question";
import { canUserEditQuestion, createTestcase, getQuestionById } from "@/server/services/question-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await context.params;

  const question = await getQuestionById(id);
  if (!question || !canUserEditQuestion(session, question)) {
    return fail("Forbidden.", 403);
  }

  const body = await request.json();
  const parsed = testcaseSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid testcase payload.");
  }

  const testcase = await createTestcase(id, parsed.data);
  return ok({ testcase });
}
