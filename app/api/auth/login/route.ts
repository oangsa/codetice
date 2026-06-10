import { createUserSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { loginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/server/services/auth-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid login payload.");
  }

  try {
    const user = await loginUser(parsed.data);
    await createUserSession(user);
    return ok({ user });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to login.", 401);
  }
}
