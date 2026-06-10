import argon2 from "argon2";
import { eq } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db";
import { users } from "@/db/schema";

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("ADMIN_USERNAME and ADMIN_PASSWORD are required for seeding.");
    process.exit(1);
  }

  const db = getDb();
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
