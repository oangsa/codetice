import { createUserSession } from "@/lib/auth";
import { fail, ok, RateLimitError } from "@/lib/api";
import { getRequestIdentifier } from "@/lib/request";
import { registerSchema } from "@/lib/validations/auth";
import { registerUser } from "@/server/services/auth-service";
import { assertRateLimit } from "@/server/services/rate-limit-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid registration payload.");
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
    if (error instanceof RateLimitError) {
      return fail("Too many attempts. Please try again later.", 429);
    }
    return fail(error instanceof Error ? error.message : "Unable to register.", 400);
  }
}
