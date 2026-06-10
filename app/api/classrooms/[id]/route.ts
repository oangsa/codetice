import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getClassroomById } from "@/server/services/classroom-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return fail("Unauthorized.", 401);
  }

  const { id } = await context.params;
  const classroom = await getClassroomById(id);
  if (!classroom) {
    return fail("Classroom not found.", 404);
  }

  return ok({ classroom });
}
