import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { listAllUsers } from "@/server/services/auth-service";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listAllUsers();
    return ok({ users });
  } catch (error) {
    return toFailResponse(error, Messages.unableToListUsers);
  }
}