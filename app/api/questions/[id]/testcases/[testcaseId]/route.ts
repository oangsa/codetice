import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { testcaseSchema } from "@/lib/validations/question";
import { deleteTestcase, updateTestcase } from "@/server/services/question-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; testcaseId: string }> },
) {
  await requireAdmin();
  const { testcaseId } = await context.params;
  const body = await request.json();
  const parsed = testcaseSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid testcase payload.");
  }

  try {
    const testcase = await updateTestcase(testcaseId, parsed.data);
    return ok({ testcase });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to update testcase.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; testcaseId: string }> },
) {
  await requireAdmin();
  const { testcaseId } = await context.params;
  await deleteTestcase(testcaseId);
  return ok({ success: true });
}
