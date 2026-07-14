import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { rateLimits } from "@/db/schema";
import { RateLimitError } from "@/lib/errors";
import { getDb } from "@/lib/db";

function bucketToMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 60_000) * 60_000);
}

export async function assertRateLimit(input: {
  identifier: string;
  action: string;
  limit: number;
  windowMinutes: number;
}) {
  const db = getDb();
  const windowCutoff = new Date(Date.now() - input.windowMinutes * 60 * 1000);

  const bucketedWindowStart = bucketToMinute(new Date());

  await db
    .insert(rateLimits)
    .values({
      identifier: input.identifier,
      action: input.action,
      count: 1,
      windowStart: bucketedWindowStart,
    })
    .onConflictDoUpdate({
      target: [rateLimits.identifier, rateLimits.action, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    });

  const existingRows = await db.query.rateLimits.findMany({
    where: and(
      eq(rateLimits.identifier, input.identifier),
      eq(rateLimits.action, input.action),
      gte(rateLimits.windowStart, windowCutoff),
    ),
  });

  const count = existingRows.reduce((sum, row) => sum + row.count, 0);
  if (count > input.limit) {
    throw new RateLimitError();
  }
}

export async function cleanupOldRateLimits() {
  const db = getDb();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, cutoff));
}
