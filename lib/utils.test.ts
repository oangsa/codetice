import { describe, expect, test } from "bun:test";

import { formatScore, slugify } from "./utils";

describe("slugify", () => {
  test("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("replaces spaces with hyphens", () => {
    expect(slugify("two sum problem")).toBe("two-sum-problem");
  });

  test("replaces special characters with hyphens", () => {
    expect(slugify("hello!@#world")).toBe("hello-world");
  });

  test("collapses multiple hyphens", () => {
    expect(slugify("a---b---c")).toBe("a-b-c");
  });

  test("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  test("empty string returns empty", () => {
    expect(slugify("")).toBe("");
  });

  test("whitespace-only returns empty", () => {
    expect(slugify("   ")).toBe("");
  });

  test("preserves numbers", () => {
    expect(slugify("problem 42")).toBe("problem-42");
  });

  test("unicode characters are replaced", () => {
    expect(slugify("café résumé")).toBe("caf-r-sum");
  });
});

describe("formatScore", () => {
  test("integer stays as-is", () => {
    expect(formatScore(100)).toBe("100");
  });

  test("decimal shows two places", () => {
    expect(formatScore(33.33)).toBe("33.33");
  });

  test("string integer stays as-is", () => {
    expect(formatScore("100")).toBe("100");
  });

  test("string decimal shows two places", () => {
    expect(formatScore("33.33")).toBe("33.33");
  });

  test("zero formats correctly", () => {
    expect(formatScore(0)).toBe("0");
  });

  test("string zero formats correctly", () => {
    expect(formatScore("0")).toBe("0");
  });

  test("whole number decimal stays integer-like", () => {
    expect(formatScore(50.0)).toBe("50");
  });
});
