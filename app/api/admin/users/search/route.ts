import { paged, toFailResponse, Messages } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { searchUsersPage } from "@/server/auth/service";

export async function POST(request: Request) {
  try {
    await requireApiAdmin();
    return paged(await searchUsersPage(await request.json()));
  } catch (error) {
    return toFailResponse(error, Messages.unableToListUsers);
  }
}
