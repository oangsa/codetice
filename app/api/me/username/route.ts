import { requireApiUser, createUserSession } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { updateUsername } from "@/server/auth/service";
import { z } from "zod";

const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    const body = await request.json();
    const parsed = updateUsernameSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || Messages.invalidUsername, 400, { code: ErrorCode.VALIDATION });
    }

    const updatedUser = await updateUsername(session.userId, parsed.data.username);
    
    // Refresh the user session cookie with the new username
    await createUserSession(updatedUser);

    return ok({ user: updatedUser });
  } catch (error) {
    return toFailResponse(error, Messages.unableToUpdateUsername);
  }
}
