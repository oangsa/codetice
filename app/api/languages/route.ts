import { paged, toFailResponse } from "@/lib/api";
import { parsePageRequestFromSearchParams } from "@/lib/pagination";
import { listPublicLanguagesPage } from "@/server/languages/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return paged(await listPublicLanguagesPage(parsePageRequestFromSearchParams(url.searchParams)));
  } catch (error) {
    return toFailResponse(error);
  }
}
