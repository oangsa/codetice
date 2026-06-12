import "server-only";

import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { idempotencyKeys } from "@/db/schema";
import { getDb } from "@/lib/db";

type CachedResponse<T> = {
  kind: "cached";
  status: number;
  body: T;
};

type FreshResponse = {
  kind: "fresh";
  keyId: string;
};

export function hashIdempotencyPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function beginIdempotentRequest<T>(input: {
  identifier: string;
  action: string;
  key: string;
  requestHash: string;
}): Promise<CachedResponse<T> | FreshResponse> {
  const db = getDb();

  const [inserted] = await db
    .insert(idempotencyKeys)
    .values({
      identifier: input.identifier,
      action: input.action,
      key: input.key,
      requestHash: input.requestHash,
    })
    .onConflictDoNothing()
    .returning({
      id: idempotencyKeys.id,
    });

  if (inserted) {
    return {
      kind: "fresh",
      keyId: inserted.id,
    };
  }

  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.identifier, input.identifier),
      eq(idempotencyKeys.action, input.action),
      eq(idempotencyKeys.key, input.key),
    ),
  });

  if (!existing) {
    throw new Error("Unable to resolve idempotency state.");
  }

  if (existing.requestHash !== input.requestHash) {
    throw new Error("Idempotency key was reused with a different payload.");
  }

  if (existing.responseStatus !== null && existing.responseBody) {
    return {
      kind: "cached",
      status: existing.responseStatus,
      body: JSON.parse(existing.responseBody) as T,
    };
  }

  throw new Error("A matching request is already in progress.");
}

export async function completeIdempotentRequest(input: {
  keyId: string;
  status: number;
  body: unknown;
}) {
  const db = getDb();
  await db
    .update(idempotencyKeys)
    .set({
      responseStatus: input.status,
      responseBody: JSON.stringify(input.body),
      completedAt: new Date(),
    })
    .where(eq(idempotencyKeys.id, input.keyId));
}
