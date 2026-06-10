import { createUserSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { registerSchema } from "@/lib/validations/auth";
import { registerUser } from "@/server/services/auth-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid registration payload.");
  }

  try {
    const user = await registerUser(parsed.data);
    await createUserSession(user);
    return ok({ user });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to register.", 400);
  }
}
