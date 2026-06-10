import { getSession, requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { assignmentSchema } from "@/lib/validations/classroom";
import { createAssignment, listAssignmentsForUser } from "@/server/services/classroom-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return fail("Unauthorized.", 401);
  }

  const assignments = await listAssignmentsForUser(session.userId, session.role);
  return ok({ assignments });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = assignmentSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid assignment payload.");
  }

  try {
    const assignment = await createAssignment(parsed.data);
    return ok({ assignment });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create assignment.");
  }
}
