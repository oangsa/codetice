import { createUserSession } from "@/lib/auth";
import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { loginSchema } from "@/modules/auth/schema";
import { loginUser } from "@/server/auth/service";
import { assertRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    await assertRateLimit({
      identifier: await getRequestIdentifier(),
      action: "login",
      limit: 20,
      windowMinutes: 15,
    });
    const user = await loginUser(parsed.data);
    await createUserSession(user);
    return ok({ user });
  } catch (error) {
    return toFailResponse(error, Messages.invalidCredentials);
  }
}