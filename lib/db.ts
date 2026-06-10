import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

declare global {
  var __vibeGraderDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use the database.");
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
  });

  return drizzle(client, { schema });
}

export function getDb() {
  if (!globalThis.__vibeGraderDb) {
    globalThis.__vibeGraderDb = createDatabase();
  }

  return globalThis.__vibeGraderDb;
}
