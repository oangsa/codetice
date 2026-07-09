import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminUpdateUserSchema } from "@/lib/validations/auth";
import { adminDeleteUser, adminUpdateUser } from "@/server/services/auth-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }

  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const user = await adminUpdateUser({
      currentUserId: session.userId,
      targetUserId: id,
      ...parsed.data,
    });
    return ok({ user });
  } catch (error) {
    return toFailResponse(error, Messages.unableToUpdateUser);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await params;

  try {
    await adminDeleteUser({
      currentUserId: session.userId,
      targetUserId: id,
    });
    return ok({ message: "User deleted." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToDeleteUser);
  }
}
