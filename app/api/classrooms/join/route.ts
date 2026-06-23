import { requireUser } from "@/lib/auth";
import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { joinClassroomSchema } from "@/lib/validations/classroom";
import { joinClassroom } from "@/server/services/classroom-service";

export async function POST(request: Request) {
  const session = await requireUser();
  const body = await request.json();
  const parsed = joinClassroomSchema.safeParse(body);

  if (!parsed.success) {
    return fail(Messages.invalidInviteCode, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const classroom = await joinClassroom(parsed.data.inviteCode, session.userId);
    return ok({ classroom });
  } catch (error) {
    return toFailResponse(error, Messages.unableToJoinClassroom);
  }
}
