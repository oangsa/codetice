import { NextResponse } from "next/server";

export * from "@/lib/errors";

import { Messages, toErrorInfo } from "@/lib/errors";
import type { PagedResult } from "@/lib/pagination";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/**
 * Matches the platform list contract: the response body is the current page's
 * items and the complete page metadata travels in `X-Pagination`.
 */
export function paged<T>(page: PagedResult<T>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("X-Pagination", JSON.stringify(page.meta));
  return NextResponse.json(page.items, { ...init, headers });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ...extra, message }, { status });
}

export function toFailResponse(error: unknown, fallback: string = Messages.somethingWrong) {
  const { message, status, code } = toErrorInfo(error, fallback);
  return NextResponse.json({ message, code }, { status });
}
