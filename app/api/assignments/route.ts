import { getSession, requireAdmin } from "@/lib/auth";
import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { assignmentSchema } from "@/lib/validations/classroom";
import { createAssignment, listAssignmentsForUser } from "@/server/services/classroom-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const assignments = await listAssignmentsForUser(session.userId, session.role);
  return ok({ assignments });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = assignmentSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const assignment = await createAssignment(parsed.data);
    return ok({ assignment });
  } catch (error) {
    return toFailResponse(error, Messages.unableToCreateAssignment);
  }
}
