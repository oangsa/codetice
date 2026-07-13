import { describe, expect, test } from "bun:test";

import { paged, toFailResponse } from "./api";
import { AppError, ErrorCode, Messages } from "./errors";
import { z } from "zod";

describe("API authentication failures", () => {
  test("returns structured JSON 401 without a redirect location", async () => {
    const response = toFailResponse(new AppError(Messages.unauthorized, 401, ErrorCode.UNAUTHORIZED));

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({
      message: Messages.unauthorized,
      code: ErrorCode.UNAUTHORIZED,
    });
  });

  test("returns structured JSON 403 without a redirect location", async () => {
    const response = toFailResponse(new AppError(Messages.forbidden, 403, ErrorCode.FORBIDDEN));

    expect(response.status).toBe(403);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({
      message: Messages.forbidden,
      code: ErrorCode.FORBIDDEN,
    });
  });

  test("maps request validation errors to JSON 400", async () => {
    const schema = z.object({ id: z.string().uuid() });
    const response = toFailResponse(schema.safeParse({ id: "bad" }).error, Messages.invalidRequest);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: Messages.invalidRequest,
      code: ErrorCode.VALIDATION,
    });
  });
});

describe("paged API responses", () => {
  test("returns current-page items with reference-compatible X-Pagination metadata", async () => {
    const response = paged({
      items: [{ id: "item-1" }],
      meta: {
        currentPage: 2,
        totalPages: 3,
        pageSize: 10,
        totalCount: 21,
        hasPrevious: true,
        hasNext: true,
      },
    });

    expect(await response.json()).toEqual([{ id: "item-1" }]);
    expect(JSON.parse(response.headers.get("X-Pagination") ?? "null")).toEqual({
      currentPage: 2,
      totalPages: 3,
      pageSize: 10,
      totalCount: 21,
      hasPrevious: true,
      hasNext: true,
    });
  });
});
