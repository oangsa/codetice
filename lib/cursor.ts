import { createHmac, timingSafeEqual } from "node:crypto";

import { AppError, ErrorCode, Messages } from "@/lib/errors";

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;

type CursorKey = string | number | null;

type CursorPayload = {
  version: 1;
  endpoint: string;
  scope: string;
  filters: string;
  keys: CursorKey[];
};

type CursorInput = Omit<CursorPayload, "version">;
type CursorBinding = Pick<CursorPayload, "endpoint" | "scope" | "filters">;

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function encodeCursor(input: CursorInput, secret = process.env.SESSION_SECRET ?? "") {
  if (!secret) {
    throw new Error("Cursor signing secret is not configured.");
  }

  const encodedPayload = Buffer.from(JSON.stringify({ version: 1, ...input }), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function decodeCursor(
  cursor: string,
  binding: CursorBinding,
  secret = process.env.SESSION_SECRET ?? "",
): CursorPayload {
  if (!secret) {
    throw new Error("Cursor signing secret is not configured.");
  }

  const [encodedPayload, suppliedSignature, extra] = cursor.split(".");
  if (!encodedPayload || !suppliedSignature || extra) {
    throw new Error("Invalid cursor.");
  }

  const expectedSignature = sign(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Invalid cursor.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid cursor.");
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as CursorPayload).version !== 1 ||
    (payload as CursorPayload).endpoint !== binding.endpoint ||
    (payload as CursorPayload).scope !== binding.scope ||
    (payload as CursorPayload).filters !== binding.filters ||
    !Array.isArray((payload as CursorPayload).keys) ||
    !(payload as CursorPayload).keys.every(
      (key) => key === null || typeof key === "string" || (typeof key === "number" && Number.isFinite(key)),
    )
  ) {
    throw new Error("Invalid cursor.");
  }

  return payload as CursorPayload;
}

export function parsePageLimit(value: string | null) {
  if (value === null || value === "") {
    return DEFAULT_PAGE_LIMIT;
  }

  if (!/^\d+$/.test(value)) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }

  return limit;
}
