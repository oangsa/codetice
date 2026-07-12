import { createUserSession } from "@/lib/auth";
import { fail, ok, toFailResponse, Messages, ErrorCode } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { registerSchema } from "@/modules/auth/schema";
import { registerUser } from "@/server/auth/service";
import { assertRateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    await assertRateLimit({
      identifier: await getRequestIdentifier(),
      action: "register",
      limit: 10,
      windowMinutes: 15,
    });
    const user = await registerUser(parsed.data);
    await createUserSession(user);
    return ok({ user });
  } catch (error) {
    return toFailResponse(error, Messages.somethingWrong);
  }
}