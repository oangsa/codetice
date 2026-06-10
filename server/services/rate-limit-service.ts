import "server-only";

import { and, eq, gte } from "drizzle-orm";

import { rateLimits } from "@/db/schema";
import { getDb } from "@/lib/db";

export async function assertRateLimit(input: {
  identifier: string;
  action: string;
  limit: number;
  windowMinutes: number;
}) {
  const db = getDb();
  const windowStart = new Date(Date.now() - input.windowMinutes * 60 * 1000);

  const existingRows = await db.query.rateLimits.findMany({
    where: and(
      eq(rateLimits.identifier, input.identifier),
      eq(rateLimits.action, input.action),
      gte(rateLimits.windowStart, windowStart),
    ),
  });

  const count = existingRows.reduce((sum, row) => sum + row.count, 0);
  if (count >= input.limit) {
    throw new Error(`Rate limit exceeded for ${input.action}. Try again later.`);
  }

  await db.insert(rateLimits).values({
    identifier: input.identifier,
    action: input.action,
    count: 1,
    windowStart: new Date(),
  });
}
