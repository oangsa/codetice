import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { updateSupportedLanguageSchema } from "@/lib/validations/language";
import {
  deleteSupportedLanguage,
  listAllSupportedLanguages,
  updateSupportedLanguage,
} from "@/server/services/language-service";
import { getDb } from "@/lib/db";
import { supportedLanguages } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getLanguageById(id: string) {
  const db = getDb();
  return db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.id, id),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const existing = await getLanguageById(id);
  if (!existing) {
    return fail("Language not found.", 404);
  }

  const body = await request.json() as unknown;
  const parsed = updateSupportedLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid language payload.", 400, { errors: parsed.error.flatten() });
  }

  const language = await updateSupportedLanguage(id, parsed.data);
  const languages = await listAllSupportedLanguages();
  return ok({ language, languages });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const existing = await getLanguageById(id);
  if (!existing) {
    return fail("Language not found.", 404);
  }

  await deleteSupportedLanguage(id);
  return ok({ message: "Language deleted." });
}
