import { ok, toFailResponse } from "@/lib/api";
import { parsePageLimit } from "@/lib/cursor";
import { listPublicLanguagesPage } from "@/server/languages/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return ok(await listPublicLanguagesPage({
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}
