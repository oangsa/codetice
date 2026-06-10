import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getAssignmentById } from "@/server/services/classroom-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return fail("Unauthorized.", 401);
  }

  const { id } = await context.params;
  const assignment = await getAssignmentById(id);
  if (!assignment) {
    return fail("Assignment not found.", 404);
  }

  return ok({ assignment });
}
