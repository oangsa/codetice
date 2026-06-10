import { getSession, requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { classroomSchema } from "@/lib/validations/classroom";
import { createClassroom, listClassroomsForUser } from "@/server/services/classroom-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return fail("Unauthorized.", 401);
  }

  const classrooms = await listClassroomsForUser(session.userId, session.role);
  return ok({ classrooms });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  const body = await request.json();
  const parsed = classroomSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid classroom payload.");
  }

  try {
    const classroom = await createClassroom({
      name: parsed.data.name,
      createdBy: session.userId,
    });
    return ok({ classroom });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create classroom.");
  }
}
