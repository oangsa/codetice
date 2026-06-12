import "server-only";

import { eq } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";
import { getDb } from "@/lib/db";

export type LanguageInput = {
  name: string;
  slug: string;
  dockerImage: string;
  fileExtension: string;
  runCommand: string;
  defaultStarterCode?: string | null;
  isEnabled: boolean;
};

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
  const [created] = await db
    .insert(supportedLanguages)
    .values(input)
    .returning();
  return created;
}

export async function updateSupportedLanguage(
  id: string,
  input: Omit<LanguageInput, "slug">,
) {
  const db = getDb();
  const [updated] = await db
    .update(supportedLanguages)
    .set({
      name: input.name,
      dockerImage: input.dockerImage,
      fileExtension: input.fileExtension,
      runCommand: input.runCommand,
      defaultStarterCode: input.defaultStarterCode ?? null,
      isEnabled: input.isEnabled,
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
  const db = getDb();
  const existing = await getSupportedLanguageBySlug(input.slug);

  if (existing) {
    return updateSupportedLanguage(existing.id, input);
  }

  return createSupportedLanguage(input);
}
