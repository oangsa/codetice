import "server-only";

import { createHash } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { idempotencyKeys } from "@/db/schema";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getDb } from "@/lib/db";

type Db = ReturnType<typeof getDb>;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

type CachedResponse<T> = {
  kind: "cached";
  status: number;
  body: T;
};

type FreshResponse = {
  kind: "fresh";
  keyId: string;
};

export type IdempotencyRequest = {
  identifier: string;
  action: string;
  key: string;
  requestHash: string;
};

export function hashIdempotencyPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function beginIdempotentRequest<T>(
  input: IdempotencyRequest,
): Promise<CachedResponse<T> | FreshResponse> {
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
    throw new AppError(Messages.idempotencyUnresolved, 500, ErrorCode.INTERNAL);
  }

  if (existing.requestHash !== input.requestHash) {
    throw new AppError(Messages.requestConflict, 409, ErrorCode.CONFLICT);
  }

  if (existing.responseStatus !== null && existing.responseBody) {
    return {
      kind: "cached",
      status: existing.responseStatus,
      body: JSON.parse(existing.responseBody) as T,
    };
  }

  const IDEMPOTENCY_STALE_MS = 60_000;
  const ageMs = Date.now() - existing.createdAt.getTime();
  if (ageMs > IDEMPOTENCY_STALE_MS) {
    const [reclaimed] = await db
      .update(idempotencyKeys)
      .set({
        requestHash: input.requestHash,
        responseStatus: null,
        responseBody: null,
        completedAt: null,
        createdAt: new Date(),
      })
      .where(
        and(
          eq(idempotencyKeys.id, existing.id),
          eq(idempotencyKeys.createdAt, existing.createdAt),
          isNull(idempotencyKeys.completedAt),
        ),
      )
      .returning({ id: idempotencyKeys.id });

    if (reclaimed) {
      return { kind: "fresh", keyId: reclaimed.id };
    }
  }

  throw new AppError(Messages.requestInProgress, 409, ErrorCode.CONFLICT);
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

export async function cacheIdempotentFailureResponse(
  input: IdempotencyRequest & { status: number; body: unknown },
) {
  await getDb().insert(idempotencyKeys).values({
    identifier: input.identifier,
    action: input.action,
    key: input.key,
    requestHash: input.requestHash,
    responseStatus: input.status,
    responseBody: JSON.stringify(input.body),
    completedAt: new Date(),
  }).onConflictDoNothing();
}

/**
 * Reserves the key, performs the mutation, and stores its successful response
 * in one transaction. Concurrent replays block on the unique key and then read
 * the committed response, so a stale reservation can never create a duplicate
 * submission or rejudge tree.
 */
export async function executeIdempotentMutation<T>(input: {
  identifier: string;
  action: string;
  key: string;
  requestHash: string;
  responseStatus: number;
  mutate: (tx: DbTransaction) => Promise<T>;
}): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [inserted] = await tx.insert(idempotencyKeys).values({
      identifier: input.identifier,
      action: input.action,
      key: input.key,
      requestHash: input.requestHash,
    }).onConflictDoNothing().returning({ id: idempotencyKeys.id });

    if (!inserted) {
      const existing = await tx.query.idempotencyKeys.findFirst({
        where: and(
          eq(idempotencyKeys.identifier, input.identifier),
          eq(idempotencyKeys.action, input.action),
          eq(idempotencyKeys.key, input.key),
        ),
      });
      if (!existing) throw new AppError(Messages.idempotencyUnresolved, 500, ErrorCode.INTERNAL);
      if (existing.requestHash !== input.requestHash) {
        throw new AppError(Messages.requestConflict, 409, ErrorCode.CONFLICT);
      }
      if (existing.responseStatus === input.responseStatus && existing.responseBody) {
        return JSON.parse(existing.responseBody) as T;
      }
      throw new AppError(Messages.requestInProgress, 409, ErrorCode.CONFLICT);
    }

    const body = await input.mutate(tx);
    await tx.update(idempotencyKeys).set({
      responseStatus: input.responseStatus,
      responseBody: JSON.stringify(body),
      completedAt: new Date(),
    }).where(eq(idempotencyKeys.id, inserted.id));
    return body;
  });
}

export async function getCompletedIdempotentResponse<T>(input: IdempotencyRequest) {
  const existing = await getDb().query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.identifier, input.identifier),
      eq(idempotencyKeys.action, input.action),
      eq(idempotencyKeys.key, input.key),
    ),
  });
  if (!existing) return null;
  if (existing.requestHash !== input.requestHash) {
    throw new AppError(Messages.requestConflict, 409, ErrorCode.CONFLICT);
  }
  if (existing.responseBody && existing.responseStatus !== null) {
    return { body: JSON.parse(existing.responseBody) as T, status: existing.responseStatus };
  }
  throw new AppError(Messages.requestInProgress, 409, ErrorCode.CONFLICT);
}
