import { getSession } from "@/lib/auth";
import { fail, ok, Messages, ErrorCode } from "@/lib/api";
import { getAssignmentById } from "@/server/services/classroom-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await context.params;
  const assignment = await getAssignmentById(id);
  if (!assignment) {
    return fail(Messages.assignmentNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  return ok({ assignment });
}
