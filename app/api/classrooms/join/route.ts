import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { joinClassroomSchema } from "@/lib/validations/classroom";
import { joinClassroom } from "@/server/services/classroom-service";

export async function POST(request: Request) {
  const session = await requireUser();
  const body = await request.json();
  const parsed = joinClassroomSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid invite code.");
  }

  try {
    const classroom = await joinClassroom(parsed.data.inviteCode, session.userId);
    return ok({ classroom });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to join classroom.");
  }
}
