import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { supportedLanguageSchema } from "@/lib/validations/language";
import {
  createSupportedLanguage,
  getSupportedLanguageBySlug,
  listAllSupportedLanguages,
  listSupportedLanguages,
} from "@/server/services/language-service";

export async function GET() {
  const languages = await listSupportedLanguages();
  return ok({ languages });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json() as unknown;
  const parsed = supportedLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid language payload.", 400, { errors: parsed.error.flatten() });
  }

  // Reject duplicate slug
  const existing = await getSupportedLanguageBySlug(parsed.data.slug);
  if (existing) {
    return fail(`A language with slug "${parsed.data.slug}" already exists.`, 409);
  }

  const language = await createSupportedLanguage(parsed.data);
  const languages = await listAllSupportedLanguages();
  return ok({ language, languages }, { status: 201 });
}
