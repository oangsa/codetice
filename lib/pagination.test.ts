import { describe, expect, test } from "bun:test";

import { collectCursorItems, type CursorPageLike } from "./pagination";

describe("collectCursorItems", () => {
  test("consumes every stable cursor page in order", async () => {
    const pages = new Map<string | null, CursorPageLike<number>>([
      [null, { items: [1, 2], hasMore: true, nextCursor: "page-2" }],
      ["page-2", { items: [3], hasMore: true, nextCursor: "page-3" }],
      ["page-3", { items: [4, 5], hasMore: false, nextCursor: null }],
    ]);

    await expect(collectCursorItems(async (cursor) => pages.get(cursor)!)).resolves.toEqual([1, 2, 3, 4, 5]);
  });

  test("fails closed when a page claims more data without advancing", async () => {
    await expect(collectCursorItems(async () => ({
      items: [1],
      hasMore: true,
      nextCursor: null,
    }))).rejects.toThrow("Cursor pagination did not advance.");
  });
});
