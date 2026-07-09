import { requireAdmin } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok, toFailResponse } from "@/lib/api";
import { updateSupportedLanguageSchema } from "@/lib/validations/language";
import {
  deleteSupportedLanguage,
  listAllSupportedLanguages,
  updateSupportedLanguage,
} from "@/server/services/language-service";
import { getDb } from "@/lib/db";
import { supportedLanguages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

function formatLanguageValidationError(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  const firstError = Object.entries(fieldErrors).find(([, messages]) => messages.length > 0);

  if (!firstError) {
    return Messages.invalidRequest;
  }

  const [field, messages] = firstError;
  return `${field}: ${messages[0]}`;
}

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
    return fail(Messages.languageNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(Messages.invalidRequest, 400, { code: ErrorCode.VALIDATION });
  }
  const parsed = updateSupportedLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return fail(formatLanguageValidationError(parsed.error), 400, { errors: parsed.error.flatten(), code: ErrorCode.VALIDATION });
  }

  try {
    const language = await updateSupportedLanguage(id, parsed.data);
    const languages = await listAllSupportedLanguages();
    return ok({ language, languages });
  } catch (error) {
    return toFailResponse(error, Messages.unableToUpdateLanguage);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const existing = await getLanguageById(id);
  if (!existing) {
    return fail(Messages.languageNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  await deleteSupportedLanguage(id);
  return ok({ message: "Language deleted." });
}
