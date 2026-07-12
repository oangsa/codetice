import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { createUserSession, requireApiUser } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { changePasswordSchema } from "@/modules/auth/schema";
import { changePassword } from "@/server/auth/service";
import { assertRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid payload.";
      return fail(firstError, 400, { code: ErrorCode.VALIDATION });
    }
    await assertRateLimit({
      identifier: await getRequestIdentifier(),
      action: "change-password",
      limit: 10,
      windowMinutes: 15,
    });

    const updatedUser = await changePassword({
      userId: session.userId,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    await createUserSession(updatedUser);

    return ok({ message: "Password changed successfully." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToChangePassword);
  }
}
