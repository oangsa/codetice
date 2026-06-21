import { describe, expect, test } from "bun:test";

import { calculateScore } from "./score";

describe("calculateScore", () => {
  test("returns 0 when totalCount is 0", () => {
    expect(calculateScore(100, 0, 0)).toBe(0);
  });

  test("returns 0 when totalCount is negative", () => {
    expect(calculateScore(100, 0, -1)).toBe(0);
  });

  test("returns full score when all testcases pass", () => {
    expect(calculateScore(100, 5, 5)).toBe(100);
  });

  test("returns 0 when no testcases pass", () => {
    expect(calculateScore(100, 0, 5)).toBe(0);
  });

  test("returns proportional score for partial pass", () => {
    expect(calculateScore(100, 3, 5)).toBe(60);
  });

  test("handles non-even division with rounding", () => {
    expect(calculateScore(100, 1, 3)).toBe(33.33);
  });

  test("handles single testcase", () => {
    expect(calculateScore(100, 1, 1)).toBe(100);
  });

  test("handles non-100 total score", () => {
    expect(calculateScore(50, 1, 2)).toBe(25);
  });

  test("handles decimal total score", () => {
    expect(calculateScore(33.33, 1, 3)).toBe(11.11);
  });
});
