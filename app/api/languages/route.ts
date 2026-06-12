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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload.", 400);
  }
  const parsed = supportedLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid language payload.", 400, { errors: parsed.error.flatten() });
  }

  // Reject duplicate slug
  const existing = await getSupportedLanguageBySlug(parsed.data.slug);
  if (existing) {
    return fail(`A language with slug "${parsed.data.slug}" already exists.`, 409);
  }

  try {
    const language = await createSupportedLanguage(parsed.data);
    const languages = await listAllSupportedLanguages();
    return ok({ language, languages }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create language.", 400);
  }
}
