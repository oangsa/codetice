import { NextResponse } from "next/server";

export * from "@/lib/errors";

import { Messages, toErrorInfo } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ...extra, message }, { status });
}

export function toFailResponse(error: unknown, fallback: string = Messages.somethingWrong) {
  const { message, status, code } = toErrorInfo(error, fallback);
  return NextResponse.json({ message, code }, { status });
}
