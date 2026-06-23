import { getSession } from "@/lib/auth";
import { fail, ok, Messages, ErrorCode } from "@/lib/api";
import { getClassroomById } from "@/server/services/classroom-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await context.params;
  const classroom = await getClassroomById(id);
  if (!classroom) {
    return fail(Messages.classroomNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  return ok({ classroom });
}
