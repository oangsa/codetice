import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminCreateUser, listAllUsers } from "@/server/services/auth-service";
import { adminCreateUserSchema } from "@/lib/validations/auth";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listAllUsers();
    return ok({ users });
  } catch (error) {
    return toFailResponse(error, Messages.unableToListUsers);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }

  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? Messages.invalidRequest;
    return fail(firstError, 400, { code: ErrorCode.VALIDATION });
  }

  try {
    const user = await adminCreateUser(parsed.data);
    return ok({ user });
  } catch (error) {
    return toFailResponse(error, Messages.unableToCreateUser);
  }
}
