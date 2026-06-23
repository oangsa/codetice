import "server-only";

import { eq } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type LanguageInput = {
  name: string;
  slug: string;
  dockerImage: string;
  fileExtension: string;
  runCommand: string;
  editorLanguage?: string | null;
  diagnosticsFormat?: "none" | "pyright" | "compiler" | null;
  diagnosticsCommand?: string | null;
  defaultStarterCode?: string | null;
  isEnabled: boolean;
};

function normalizeLanguageInput(input: LanguageInput) {
  return {
    ...input,
    editorLanguage: input.editorLanguage?.trim() || "plaintext",
    diagnosticsFormat: input.diagnosticsFormat ?? "none",
    diagnosticsCommand: input.diagnosticsCommand?.trim() || null,
  };
}

export async function createUniqueSupportedLanguageSlug(name: string) {
  const db = getDb();
  const baseSlug = slugify(name).slice(0, 40) || "language";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db.query.supportedLanguages.findFirst({
      where: eq(supportedLanguages.slug, slug),
      columns: { id: true },
    });

    if (!existing) {
      return slug;
    }

    const suffixText = `-${suffix}`;
    slug = `${baseSlug.slice(0, 50 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
}

export async function listSupportedLanguages() {
  const db = getDb();
  return db.query.supportedLanguages.findMany({
    where: eq(supportedLanguages.isEnabled, true),
    orderBy: (fields, ops) => [ops.asc(fields.name)],
  });
}

export async function listAllSupportedLanguages() {
  const db = getDb();
  return db.query.supportedLanguages.findMany({
    orderBy: (fields, ops) => [ops.asc(fields.name)],
  });
}

export async function getSupportedLanguageBySlug(slug: string) {
  const db = getDb();
  return db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.slug, slug),
  });
}

export async function createSupportedLanguage(input: LanguageInput) {
  const db = getDb();
  const normalizedInput = normalizeLanguageInput(input);
  const [created] = await db
    .insert(supportedLanguages)
    .values(normalizedInput)
    .returning();
  return created;
}

export async function updateSupportedLanguage(
  id: string,
  input: Omit<LanguageInput, "slug">,
) {
  const db = getDb();
  const existing = await db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.id, id),
  });

  if (!existing) {
    throw new AppError(Messages.languageNotFound, 404, ErrorCode.NOT_FOUND);
  }

  const normalizedInput = normalizeLanguageInput({
    ...input,
    slug: existing.slug,
  });

  const [updated] = await db
    .update(supportedLanguages)
    .set({
      name: normalizedInput.name,
      dockerImage: normalizedInput.dockerImage,
      fileExtension: normalizedInput.fileExtension,
      runCommand: normalizedInput.runCommand,
      editorLanguage: normalizedInput.editorLanguage,
      diagnosticsFormat: normalizedInput.diagnosticsFormat,
      diagnosticsCommand: normalizedInput.diagnosticsCommand,
      defaultStarterCode: normalizedInput.defaultStarterCode ?? null,
      isEnabled: normalizedInput.isEnabled,
    })
    .where(eq(supportedLanguages.id, id))
    .returning();
  return updated;
}

export async function deleteSupportedLanguage(id: string) {
  const db = getDb();
  await db.delete(supportedLanguages).where(eq(supportedLanguages.id, id));
}

/** @deprecated Use createSupportedLanguage / updateSupportedLanguage instead */
export async function upsertSupportedLanguage(input: LanguageInput) {
  const existing = await getSupportedLanguageBySlug(input.slug);

  if (existing) {
    return updateSupportedLanguage(existing.id, input);
  }

  return createSupportedLanguage(input);
}
