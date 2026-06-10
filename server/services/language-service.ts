import "server-only";

import { eq } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";
import { getDb } from "@/lib/db";

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

export async function upsertSupportedLanguage(input: {
  name: string;
  slug: string;
  dockerImage: string;
  fileExtension: string;
  runCommand: string;
  defaultStarterCode?: string | null;
  isEnabled: boolean;
}) {
  const db = getDb();
  const existing = await getSupportedLanguageBySlug(input.slug);

  if (existing) {
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
      .where(eq(supportedLanguages.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(supportedLanguages).values(input).returning();
  return created;
}
