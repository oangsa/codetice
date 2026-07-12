import { describe, expect, test } from "bun:test";

import {
  escapeLikePattern,
  parseCollectionSearch,
} from "@/lib/collection-search";

const config = {
  fields: {
    username: ["CONTAINS", "STARTWITH", "EQUAL"] as const,
    role: ["EQUAL", "NOTEQUAL"] as const,
    createdAt: ["GREATEROREQUAL", "LESSEROREQUAL"] as const,
  },
  searchTermFields: ["username"] as const,
};

describe("collection search contract", () => {
  test("normalizes and canonically binds filters before cursor pagination", () => {
    const first = parseCollectionSearch({
      limit: 50,
      cursor: "next",
      search: [
        { name: "role", condition: "EQUAL", value: "student" },
        { name: "createdAt", condition: "GREATEROREQUAL", value: "2026-01-01" },
      ],
      searchTerm: { name: "username", value: "  Oang  " },
    }, config);
    const reordered = parseCollectionSearch({
      searchTerm: { name: "username", value: "Oang" },
      search: [
        { name: "createdAt", condition: "GREATEROREQUAL", value: "2026-01-01" },
        { name: "role", condition: "EQUAL", value: "student" },
      ],
      limit: 50,
    }, config);

    expect(first.limit).toBe(50);
    expect(first.cursor).toBe("next");
    expect(first.filters).toBe(reordered.filters);
  });

  test("rejects fields and operators that the endpoint does not expose", () => {
    expect(() => parseCollectionSearch({
      search: [{ name: "passwordHash", condition: "EQUAL", value: "x" }],
    }, config)).toThrow();
    expect(() => parseCollectionSearch({
      search: [{ name: "role", condition: "CONTAINS", value: "admin" }],
    }, config)).toThrow();
    expect(() => parseCollectionSearch({
      searchTerm: { name: "username,passwordHash", value: "x" },
    }, config)).toThrow();
  });

  test("enforces collection limits and treats SQL wildcards literally", () => {
    expect(parseCollectionSearch({}, config).limit).toBe(25);
    expect(() => parseCollectionSearch({ limit: 0 }, config)).toThrow();
    expect(() => parseCollectionSearch({ limit: 101 }, config)).toThrow();
    expect(escapeLikePattern("100%_done\\ok")).toBe("100\\%\\_done\\\\ok");
  });

  test("rejects unknown top-level and nested properties", () => {
    expect(() => parseCollectionSearch({ limti: 10 }, config)).toThrow();
    expect(() => parseCollectionSearch({
      search: [{ name: "role", condition: "EQUAL", value: "student", extra: true }],
    }, config)).toThrow();
    expect(() => parseCollectionSearch({
      searchTerm: { name: "username", value: "Ada", extra: true },
    }, config)).toThrow();
  });

  test("rejects oversized filter collections and values", () => {
    expect(() => parseCollectionSearch({
      search: Array.from({ length: 17 }, () => ({ name: "role", condition: "EQUAL", value: "student" })),
    }, config)).toThrow();
    expect(() => parseCollectionSearch({
      search: [{ name: "username", condition: "CONTAINS", value: "a".repeat(201) }],
    }, config)).toThrow();
    expect(() => parseCollectionSearch({
      searchTerm: { name: "username", value: "a".repeat(101) },
    }, config)).toThrow();
  });
});
