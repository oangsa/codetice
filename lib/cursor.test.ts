import { describe, expect, test } from "bun:test";

import { decodeCursor, encodeCursor, parsePageLimit } from "./cursor";

describe("cursor pagination", () => {
  const secret = "test-secret-with-enough-entropy";

  test("defaults and bounds collection limits", () => {
    expect(parsePageLimit(null)).toBe(25);
    expect(parsePageLimit("1")).toBe(1);
    expect(parsePageLimit("100")).toBe(100);
    expect(() => parsePageLimit("0")).toThrow();
    expect(() => parsePageLimit("101")).toThrow();
  });

  test("binds opaque cursors to endpoint and filters", () => {
    const cursor = encodeCursor(
      { endpoint: "workspace-submissions", scope: "room-1", filters: "question=q1", keys: ["2026-01-01", "id-1"] },
      secret,
    );

    expect(decodeCursor(cursor, { endpoint: "workspace-submissions", scope: "room-1", filters: "question=q1" }, secret).keys)
      .toEqual(["2026-01-01", "id-1"]);
    expect(() => decodeCursor(cursor, { endpoint: "workspace-submissions", scope: "room-2", filters: "question=q1" }, secret))
      .toThrow();
    expect(() => decodeCursor(`${cursor}x`, { endpoint: "workspace-submissions", scope: "room-1", filters: "question=q1" }, secret))
      .toThrow();
  });
});
