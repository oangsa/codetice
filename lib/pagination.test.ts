import { describe, expect, test } from "bun:test";

import {
  collectPagedItems,
  createPagedResult,
  parsePageRequest,
} from "./pagination";

describe("page-number pagination", () => {
  test("consumes every stable page in order", async () => {
    const pages = new Map<number, number[]>([
      [1, [1, 2]],
      [2, [3]],
      [3, [4, 5]],
    ]);

    await expect(collectPagedItems(async ({ pageNumber, pageSize }) => (
      createPagedResult(pages.get(pageNumber) ?? [], { currentPage: pageNumber, pageSize, totalCount: 5 })
    ), 2)).resolves.toEqual([1, 2, 3, 4, 5]);
  });

  test("fails closed when metadata does not advance", async () => {
    await expect(collectPagedItems(async ({ pageSize }) => (
      createPagedResult([1], { currentPage: 1, pageSize, totalCount: 2 })
    ), 1)).rejects.toThrow("Page-number pagination did not advance.");
  });

  test("parses reference-compatible pageNumber and pageSize values", () => {
    expect(parsePageRequest({ pageNumber: "2", pageSize: "25" })).toEqual({ pageNumber: 2, pageSize: 25 });
    expect(parsePageRequest({})).toEqual({ pageNumber: 1, pageSize: 10 });
    expect(() => parsePageRequest({ pageNumber: "0" })).toThrow();
    expect(() => parsePageRequest({ pageSize: "101" })).toThrow();
  });
});
