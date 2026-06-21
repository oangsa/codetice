import argon2 from "argon2";
import { eq } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db";
import { supportedLanguages, users } from "@/db/schema";

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("ADMIN_USERNAME and ADMIN_PASSWORD are required for seeding.");
    process.exit(1);
  }

  const db = getDb();
  const defaultLanguages = [
    {
      name: "Python",
      slug: "python",
      dockerImage: "python:3.12-alpine",
      fileExtension: "py",
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
          runCommand: language.runCommand,
          editorLanguage: language.editorLanguage,
          diagnosticsFormat: language.diagnosticsFormat,
          diagnosticsCommand: language.diagnosticsCommand,
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
