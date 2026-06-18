import { requireUser, createUserSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { updateUsername } from "@/server/services/auth-service";
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
    const session = await requireUser();
    const body = await request.json();
    const parsed = updateUsernameSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || "Invalid username.");
    }

    const updatedUser = await updateUsername(session.userId, parsed.data.username);
    
    // Refresh the user session cookie with the new username
    await createUserSession(updatedUser);

    return ok({ user: updatedUser });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to update username.", 400);
  }
}
