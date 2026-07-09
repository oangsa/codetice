import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { createAppUrl } from "@/lib/app-url";
import { requireAdmin } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { assertRateLimit } from "@/server/services/rate-limit-service";
import { createPasswordResetToken } from "@/server/services/auth-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await params;

  try {
    await assertRateLimit({
      identifier: await getRequestIdentifier(),
      action: "admin-generate-reset-link",
      limit: 30,
      windowMinutes: 15,
    });

    const { token, expiresAt } = await createPasswordResetToken({ userId: id });
    const url = createAppUrl("/reset-password");
    url.searchParams.set("token", token);

    return ok({
      resetUrl: url.toString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return toFailResponse(error, Messages.unableToGenerateResetLink);
  }
}
