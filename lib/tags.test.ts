import { describe, expect, test } from "bun:test";

import { PRESET_TAGS } from "@/lib/tags";

describe("shared teaching tags", () => {
  test("keeps the complete read-only preset catalog stable", () => {
    expect(PRESET_TAGS).toHaveLength(13);
    expect(PRESET_TAGS.map((tag) => tag.name)).toEqual([
      "Arrays",
      "Strings",
      "Loops",
      "Conditionals",
      "Functions",
      "Recursion",
      "Sorting",
      "Searching",
      "Math",
      "Stack/Queue",
      "Tree",
      "Graph",
      "Dynamic Programming",
    ]);
    expect(new Set(PRESET_TAGS.map((tag) => tag.slug)).size).toBe(PRESET_TAGS.length);
  });
});
