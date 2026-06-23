import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminResetPasswordSchema } from "@/lib/validations/auth";
import { adminResetPassword } from "@/server/services/auth-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = adminResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid payload.";
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    await adminResetPassword({
      targetUserId: id,
      newPassword: parsed.data.newPassword,
    });

    return ok({ message: "Password reset successfully." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToResetPassword);
  }
}