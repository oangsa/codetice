import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { parsePageLimit } from "@/lib/cursor";
import { supportedLanguageSchema } from "@/modules/admin/language-schema";
import {
  createSupportedLanguage,
  createUniqueSupportedLanguageSlug,
  listAdminLanguagesPage,
} from "@/server/languages/service";

export async function GET(request: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(request.url);
    return ok(await listAdminLanguagesPage({
      limit: parsePageLimit(url.searchParams.get("limit")),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    return toFailResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiAdmin();
    const body = supportedLanguageSchema.parse(await request.json());
    const slug = await createUniqueSupportedLanguageSlug(body.name);
    return ok({ language: await createSupportedLanguage({ ...body, slug }) }, { status: 201 });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToCreateLanguage);
  }
}
