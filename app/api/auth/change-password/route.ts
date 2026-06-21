import { fail, ok, RateLimitError } from "@/lib/api";
import { createUserSession, requireUser } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { changePasswordSchema } from "@/lib/validations/auth";
import { changePassword } from "@/server/services/auth-service";
import { assertRateLimit } from "@/server/services/rate-limit-service";

export async function POST(request: Request) {
  const session = await requireUser();

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid payload.";
    return fail(firstError);
  }

  try {
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
    if (error instanceof RateLimitError) {
      return fail("Too many attempts. Please try again later.", 429);
    }
    return fail(error instanceof Error ? error.message : "Unable to change password.");
  }
}
