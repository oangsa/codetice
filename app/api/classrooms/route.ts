import { getSession, requireAdmin } from "@/lib/auth";
import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { classroomSchema } from "@/lib/validations/classroom";
import { createClassroom, listClassroomsForUser } from "@/server/services/classroom-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const classrooms = await listClassroomsForUser(session.userId, session.role);
  return ok({ classrooms });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  const body = await request.json();
  const parsed = classroomSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const classroom = await createClassroom({
      name: parsed.data.name,
      createdBy: session.userId,
    });
    return ok({ classroom });
  } catch (error) {
    return toFailResponse(error, Messages.unableToCreateClassroom);
  }
}
