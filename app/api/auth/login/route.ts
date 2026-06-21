import { createUserSession } from "@/lib/auth";
import { fail, ok, RateLimitError } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { loginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/server/services/auth-service";
import { assertRateLimit } from "@/server/services/rate-limit-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid login payload.");
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
    if (error instanceof RateLimitError) {
      return fail("Too many attempts. Please try again later.", 429);
    }
    return fail(error instanceof Error ? error.message : "Unable to login.", 401);
  }
}
