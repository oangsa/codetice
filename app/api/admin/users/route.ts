import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { listUsersPage } from "@/server/auth/service";
import { adminCreateUser } from "@/server/auth/service";
import { adminCreateUserSchema } from "@/modules/auth/schema";

export async function GET(request: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(request.url);
    return ok(await listUsersPage({
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error, Messages.unableToListUsers);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiAdmin();
    const parsed = adminCreateUserSchema.parse(await request.json());
    return ok({ user: await adminCreateUser(parsed) }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, Messages.unableToCreateUser);
  }
}
