import { describe, expect, test } from "bun:test";

import { validateSessionUser } from "./session-validation";

describe("validateSessionUser", () => {
  const user = { userId: "u1", role: "student" as const, tokenVersion: 4 };

  test("rejects stale token versions", () => {
    expect(validateSessionUser({ userId: "u1", role: "admin", tokenVersion: 3 }, user)).toBeNull();
  });

  test("returns the current database role rather than a stale JWT role", () => {
    expect(validateSessionUser({ userId: "u1", role: "admin", tokenVersion: 4 }, user)).toEqual(user);
  });
});
