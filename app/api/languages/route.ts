import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { supportedLanguageSchema } from "@/lib/validations/language";
import { listAllSupportedLanguages, listSupportedLanguages, upsertSupportedLanguage } from "@/server/services/language-service";

export async function GET() {
  const languages = await listSupportedLanguages();
  return ok({ languages });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = supportedLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid language payload.");
  }

  const language = await upsertSupportedLanguage(parsed.data);
  const languages = await listAllSupportedLanguages();
  return ok({ language, languages });
}
