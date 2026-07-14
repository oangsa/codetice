import { ok, toFailResponse, Messages } from "@/lib/api";
import { createAppUrl } from "@/lib/app-url";
import { requireApiAdmin } from "@/lib/auth";
import { getRequestIdentifier } from "@/lib/request";
import { assertRateLimit } from "@/server/security/rate-limit";
import { createPasswordResetToken } from "@/server/auth/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiAdmin();
    const { id } = await params;
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
