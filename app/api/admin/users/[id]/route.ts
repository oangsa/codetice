import { z } from "zod";

import { Messages, ok, toFailResponse } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { adminUpdateUserSchema } from "@/modules/auth/schema";
import { adminDeleteUser, adminUpdateUser } from "@/server/auth/service";

const idSchema = z.string().uuid();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiAdmin();
    const { id } = await context.params;
    const input = adminUpdateUserSchema.parse(await request.json());
    return ok({
      user: await adminUpdateUser({
        currentUserId: actor.userId,
        targetUserId: idSchema.parse(id),
        ...input,
      }),
    });
  } catch (error) {
    return toFailResponse(error, Messages.unableToUpdateUser);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiAdmin();
    const { id } = await context.params;
    await adminDeleteUser({ currentUserId: actor.userId, targetUserId: idSchema.parse(id) });
    return ok({ message: "User deleted." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToDeleteUser);
  }
}
