import { ok, toFailResponse } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { searchAdminLanguagesPage } from "@/server/languages/service";

export async function POST(request: Request) {
  try {
    await requireApiAdmin();
    return ok(await searchAdminLanguagesPage(await request.json()));
  } catch (error) {
    return toFailResponse(error);
  }
}
