import { requireUser, createUserSession } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { updateProfilePicture } from "@/server/services/auth-service";
import { z } from "zod";

const updateProfilePictureSchema = z.object({
  profilePicture: z.string().min(1, "Profile picture path is required"),
});

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const body = await request.json();
    const parsed = updateProfilePictureSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
    }

    const updatedUser = await updateProfilePicture(session.userId, parsed.data.profilePicture);
    
    // Update the session cookie with the new profile picture
    await createUserSession(updatedUser);

    return ok({ user: updatedUser });
  } catch (error) {
    return toFailResponse(error, Messages.unableToSaveProfilePicture);
  }
}
