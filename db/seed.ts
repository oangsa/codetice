import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db";
import { supportedLanguages, tags, users } from "@/db/schema";
import { PRESET_TAGS } from "@/lib/tags";

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("ADMIN_USERNAME and ADMIN_PASSWORD are required for seeding.");
    process.exit(1);
  }

  const db = getDb();
  for (const preset of PRESET_TAGS) {
    const existingTag = await db.query.tags.findFirst({
      where: and(eq(tags.slug, preset.slug), isNull(tags.workspaceId)),
      columns: { id: true },
    });
    if (!existingTag) {
      await db.insert(tags).values({
        name: preset.name,
        slug: preset.slug,
        workspaceId: null,
        isPreset: true,
      });
    }
  }

  const defaultLanguages = [
    {
      name: "Python",
      slug: "python",
      dockerImage: "python:3.12-alpine",
      fileExtension: "py",
      buildCommand: null,
      runCommand: "python {file}",
      editorLanguage: "python",
      diagnosticsFormat: "pyright",
      diagnosticsCommand: null,
      defaultStarterCode: "print('')",
      isEnabled: true,
    },
    {
      name: "JavaScript",
      slug: "javascript",
      dockerImage: "node:22-alpine",
      fileExtension: "js",
      buildCommand: null,
      runCommand: "node {file}",
      editorLanguage: "javascript",
      diagnosticsFormat: "none",
      diagnosticsCommand: null,
      defaultStarterCode: "console.log('');",
      isEnabled: true,
    },
    {
      name: "TypeScript",
      slug: "typescript",
      dockerImage: "oven/bun:1-alpine",
      fileExtension: "ts",
      buildCommand: null,
      runCommand: "bun {file}",
      editorLanguage: "typescript",
      diagnosticsFormat: "none",
      diagnosticsCommand: null,
      defaultStarterCode: "console.log('');",
      isEnabled: true,
    },
  ] as const;

  for (const language of defaultLanguages) {
    const existingLanguage = await db.query.supportedLanguages.findFirst({
      where: eq(supportedLanguages.slug, language.slug),
    });

    if (!existingLanguage) {
      await db.insert(supportedLanguages).values(language);
    } else {
      await db
        .update(supportedLanguages)
        .set({
          dockerImage: language.dockerImage,
          fileExtension: language.fileExtension,
          buildCommand: language.buildCommand,
          runCommand: language.runCommand,
          editorLanguage: language.editorLanguage,
          diagnosticsFormat: language.diagnosticsFormat,
          diagnosticsCommand: language.diagnosticsCommand,
          runtimeStatus: "pending",
          runtimeCheckedAt: null,
          runtimeError: null,
        })
        .where(eq(supportedLanguages.id, existingLanguage.id));
    }
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    console.log(`Admin user '${username}' already exists.`);
    return;
  }

  const passwordHash = await argon2.hash(password);

  await db.insert(users).values({
    username,
    passwordHash,
    role: "admin",
  });

  console.log(`Created admin user '${username}'.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
