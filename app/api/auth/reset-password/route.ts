import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { resetPasswordWithTokenSchema } from "@/lib/validations/auth";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { resetPasswordWithToken } from "@/server/services/auth-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordWithTokenSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid payload.";
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    await assertRateLimit({
      identifier: await getRequestIdentifier(),
      action: "reset-password-with-token",
      limit: 10,
      windowMinutes: 15,
    });

    await resetPasswordWithToken({
      token: parsed.data.token,
      newPassword: parsed.data.newPassword,
    });

    return ok({ message: "Password reset successfully." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToResetPassword);
  }
}