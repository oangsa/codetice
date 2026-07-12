import "server-only";

import { and, asc, eq, gt, or } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { getDb } from "@/lib/db";
import { validateDockerImage } from "@/server/languages/docker-image";
import {
  enabledLanguageOptionColumns,
  enabledLanguageOptionsWhere,
} from "@/server/languages/options";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { validateRuntimeCommands } from "@/server/languages/runtime-config";
import { slugify } from "@/lib/utils";

export type LanguageInput = {
  name: string;
  slug: string;
  dockerImage: string;
  fileExtension: string;
  buildCommand?: string | null;
  runCommand: string;
  editorLanguage?: string | null;
  diagnosticsFormat?: "none" | "pyright" | "compiler" | null;
  diagnosticsCommand?: string | null;
  defaultStarterCode?: string | null;
  isEnabled: boolean;
};

function normalizeLanguageInput(input: LanguageInput) {
  const dockerImage = input.dockerImage.trim();
  validateDockerImage(dockerImage);
  const fileExtension = input.fileExtension.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_+-]{0,19}$/.test(fileExtension)) {
    throw new AppError(Messages.langMissingFileExt, 400, ErrorCode.VALIDATION);
  }
  const { buildCommand, runCommand } = validateRuntimeCommands(input);
  return {
    ...input,
    dockerImage,
    fileExtension,
    runCommand,
    buildCommand,
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
  while (await db.query.supportedLanguages.findFirst({
    where: eq(supportedLanguages.slug, slug),
    columns: { id: true },
  })) {
    const suffixText = `-${suffix++}`;
    slug = `${baseSlug.slice(0, 50 - suffixText.length)}${suffixText}`;
  }
  return slug;
}

function parseLanguageCursor(cursor: string | null, endpoint: string, filters: string) {
  if (!cursor) return undefined;
  try {
    const decoded = decodeCursor(cursor, { endpoint, scope: "global", filters });
    const [name, id] = decoded.keys;
    if (typeof name !== "string" || typeof id !== "string") throw new Error();
    return or(
      gt(supportedLanguages.name, name),
      and(eq(supportedLanguages.name, name), gt(supportedLanguages.id, id)),
    );
  } catch {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
}

export async function listPublicLanguagesPage(input: { limit: number; cursor: string | null }) {
  const endpoint = "enabled-languages";
  const filters = "enabled=true";
  const db = getDb();
  const rows = await db.select({
    id: supportedLanguages.id,
    name: supportedLanguages.name,
    slug: supportedLanguages.slug,
    fileExtension: supportedLanguages.fileExtension,
    editorLanguage: supportedLanguages.editorLanguage,
    diagnosticsFormat: supportedLanguages.diagnosticsFormat,
    defaultStarterCode: supportedLanguages.defaultStarterCode,
  }).from(supportedLanguages).where(and(
    enabledLanguageOptionsWhere(),
    parseLanguageCursor(input.cursor, endpoint, filters),
  )).orderBy(asc(supportedLanguages.name), asc(supportedLanguages.id)).limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ endpoint, scope: "global", filters, keys: [last.name, last.id] }) : null,
  };
}

export async function listAdminLanguagesPage(input: { limit: number; cursor: string | null }) {
  const endpoint = "admin-languages";
  const filters = "";
  const db = getDb();
  const rows = await db.query.supportedLanguages.findMany({
    where: parseLanguageCursor(input.cursor, endpoint, filters),
    orderBy: (fields, ops) => [ops.asc(fields.name), ops.asc(fields.id)],
    limit: input.limit + 1,
  });
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ endpoint, scope: "global", filters, keys: [last.name, last.id] }) : null,
  };
}

export async function listSupportedLanguages() {
  const db = getDb();
  return db.query.supportedLanguages.findMany({
    where: enabledLanguageOptionsWhere(),
    orderBy: (fields, ops) => [ops.asc(fields.name)],
  });
}

export async function listEnabledLanguageOptions() {
  return getDb()
    .select(enabledLanguageOptionColumns)
    .from(supportedLanguages)
    .where(enabledLanguageOptionsWhere())
    .orderBy(asc(supportedLanguages.name), asc(supportedLanguages.id));
}

export async function listEnabledLanguageRuntimes() {
  const db = getDb();
  return db.query.supportedLanguages.findMany({
    where: eq(supportedLanguages.isEnabled, true),
    orderBy: (fields, ops) => [ops.asc(fields.name)],
  });
}

export async function getSupportedLanguageBySlug(slug: string) {
  return getDb().query.supportedLanguages.findFirst({ where: eq(supportedLanguages.slug, slug) });
}

export async function createSupportedLanguage(input: LanguageInput) {
  const normalized = normalizeLanguageInput(input);
  const [created] = await getDb().insert(supportedLanguages).values({
    ...normalized,
    runtimeStatus: "pending",
    runtimeCheckedAt: null,
    runtimeError: null,
  }).returning();
  return created;
}

export async function updateSupportedLanguage(id: string, input: Omit<LanguageInput, "slug">) {
  const db = getDb();
  const existing = await db.query.supportedLanguages.findFirst({ where: eq(supportedLanguages.id, id) });
  if (!existing) throw new AppError(Messages.languageNotFound, 404, ErrorCode.NOT_FOUND);
  const normalized = normalizeLanguageInput({ ...input, slug: existing.slug });
  const [updated] = await db.update(supportedLanguages).set({
    ...normalized,
    runtimeStatus: "pending",
    runtimeCheckedAt: null,
    runtimeError: null,
  }).where(eq(supportedLanguages.id, id)).returning();
  return updated;
}

export async function markLanguageRuntimeReady(id: string, dockerImage: string) {
  await getDb().update(supportedLanguages).set({
    runtimeStatus: "ready",
    runtimeCheckedAt: new Date(),
    runtimeError: null,
  }).where(and(
    eq(supportedLanguages.id, id),
    eq(supportedLanguages.dockerImage, dockerImage),
  ));
}

export async function markLanguageRuntimeError(id: string, dockerImage: string, error: string) {
  await getDb().update(supportedLanguages).set({
    runtimeStatus: "error",
    runtimeCheckedAt: new Date(),
    runtimeError: error.slice(0, 4000),
  }).where(and(
    eq(supportedLanguages.id, id),
    eq(supportedLanguages.dockerImage, dockerImage),
  ));
}

export async function deleteSupportedLanguage(id: string) {
  await getDb().delete(supportedLanguages).where(eq(supportedLanguages.id, id));
}
