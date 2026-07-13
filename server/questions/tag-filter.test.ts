import { describe, expect, test } from "bun:test";

import { parseQuestionTagIds } from "@/lib/question-tag-filters";

const arraysTagId = "11111111-1111-4111-8111-111111111111";
const stringsTagId = "22222222-2222-4222-8222-222222222222";

describe("workspace question tag filters", () => {
  test("canonicalizes repeated GET tag filters for stable page queries", () => {
    expect(parseQuestionTagIds([stringsTagId, arraysTagId])).toEqual([arraysTagId, stringsTagId]);
  });

  test("rejects duplicate or malformed tag filters", () => {
    expect(() => parseQuestionTagIds([arraysTagId, arraysTagId])).toThrow();
    expect(() => parseQuestionTagIds(["not-a-uuid"])).toThrow();
  });
});
