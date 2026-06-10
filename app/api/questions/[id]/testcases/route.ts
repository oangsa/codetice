import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { testcaseSchema } from "@/lib/validations/question";
import { createTestcase } from "@/server/services/question-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json();
  const parsed = testcaseSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid testcase payload.");
  }

  const testcase = await createTestcase(id, parsed.data);
  return ok({ testcase });
}
