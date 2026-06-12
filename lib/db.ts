import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "@/db/schema";

declare global {
  var __vibeGraderDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __vibeGraderSqlClient: Sql | undefined;
}

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use the database.");
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    // Allow enough time for cold-start on serverless Postgres (Neon, Supabase, etc.).
    // The server-level statement_timeout can be very short; override it per-connection.
    connect_timeout: 30,
    connection: {
      statement_timeout: 30000, // 30 s — overrides the server default
    },
  });
  globalThis.__vibeGraderSqlClient = client;

  return drizzle(client, { schema });
}

export function getDb() {
  if (!globalThis.__vibeGraderDb) {
    globalThis.__vibeGraderDb = createDatabase();
  }

  return globalThis.__vibeGraderDb;
}

export function getSqlClient() {
  if (!globalThis.__vibeGraderSqlClient) {
    getDb();
  }

  if (!globalThis.__vibeGraderSqlClient) {
    throw new Error("Database client is unavailable.");
  }

  return globalThis.__vibeGraderSqlClient;
}

export async function closeDb() {
  if (globalThis.__vibeGraderSqlClient) {
    await globalThis.__vibeGraderSqlClient.end({ timeout: 5 });
    globalThis.__vibeGraderSqlClient = undefined;
    globalThis.__vibeGraderDb = undefined;
  }
}
