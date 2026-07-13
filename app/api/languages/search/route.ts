import { paged, toFailResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { searchPublicLanguagesPage } from "@/server/languages/service";

export async function POST(request: Request) {
  try {
    await requireApiUser();
    return paged(await searchPublicLanguagesPage(await request.json()));
  } catch (error) {
    return toFailResponse(error);
  }
}
