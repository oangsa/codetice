import { describe, expect, test } from "bun:test";

import { compareOutput, normalizeOutput } from "./compare-output";

describe("normalizeOutput", () => {
  test("trims leading and trailing whitespace", () => {
    expect(normalizeOutput("  hello  ")).toBe("hello");
  });

  test("converts CRLF to LF", () => {
    expect(normalizeOutput("a\r\nb\r\nc")).toBe("a\nb\nc");
  });

  test("trims trailing whitespace per line", () => {
    expect(normalizeOutput("a  \nb  \nc")).toBe("a\nb\nc");
  });

  test("empty string stays empty", () => {
    expect(normalizeOutput("")).toBe("");
  });

  test("whitespace-only string becomes empty after trim", () => {
    expect(normalizeOutput("   \n   \n   ")).toBe("");
  });

  test("handles single line with no trailing whitespace", () => {
    expect(normalizeOutput("hello")).toBe("hello");
  });

  test("handles multiple blank lines", () => {
    expect(normalizeOutput("\n\n\n")).toBe("");
  });
});

describe("compareOutput", () => {
  describe("exact mode (default)", () => {
    test("equal strings pass", () => {
      expect(compareOutput("hello", "hello")).toBe(true);
    });

    test("different strings fail", () => {
      expect(compareOutput("hello", "world")).toBe(false);
    });

    test("trailing whitespace is normalized", () => {
      expect(compareOutput("hello  ", "hello")).toBe(true);
    });

    test("leading whitespace is normalized", () => {
      expect(compareOutput("  hello", "hello")).toBe(true);
    });

    test("extra blank lines matter", () => {
      expect(compareOutput("a\n\nb", "a\nb")).toBe(false);
    });
  });

  describe("ignore_trailing_whitespace mode", () => {
    test("equal strings pass", () => {
      expect(compareOutput("hello", "hello", "ignore_trailing_whitespace")).toBe(true);
    });

    test("trailing spaces ignored", () => {
      expect(compareOutput("hello  ", "hello", "ignore_trailing_whitespace")).toBe(true);
    });

    test("leading/trailing newlines normalized", () => {
      expect(compareOutput("\nhello\n", "hello", "ignore_trailing_whitespace")).toBe(true);
    });

    test("different content fails", () => {
      expect(compareOutput("hello", "world", "ignore_trailing_whitespace")).toBe(false);
    });
  });

  describe("ignore_all_whitespace mode", () => {
    test("equal strings pass", () => {
      expect(compareOutput("hello", "hello", "ignore_all_whitespace")).toBe(true);
    });

    test("all whitespace removed before comparison", () => {
      expect(compareOutput("h e l l o", "hello", "ignore_all_whitespace")).toBe(true);
    });

    test("newlines and spaces ignored", () => {
      expect(compareOutput("he\nll o", "hello", "ignore_all_whitespace")).toBe(true);
    });

    test("different content fails", () => {
      expect(compareOutput("hello", "world", "ignore_all_whitespace")).toBe(false);
    });
  });

  describe("floating_point_tolerance mode", () => {
    test("exact integers pass", () => {
      expect(compareOutput("42", "42", "floating_point_tolerance")).toBe(true);
    });

    test("values within default tolerance pass", () => {
      expect(compareOutput("3.1415900", "3.1415901", "floating_point_tolerance")).toBe(true);
    });

    test("values outside default tolerance fail", () => {
      expect(compareOutput("3.14", "3.20", "floating_point_tolerance")).toBe(false);
    });

    test("custom tolerance applied", () => {
      expect(compareOutput("10.0", "10.05", "floating_point_tolerance", "0.1")).toBe(true);
      expect(compareOutput("10.0", "10.2", "floating_point_tolerance", "0.1")).toBe(false);
    });

    test("multi-line numeric output compared token-by-token", () => {
      expect(compareOutput("1.0 2.0\n3.0", "1.0 2.0\n3.0", "floating_point_tolerance")).toBe(true);
    });

    test("different token count fails", () => {
      expect(compareOutput("1.0 2.0", "1.0", "floating_point_tolerance")).toBe(false);
    });

    test("non-numeric tokens fail", () => {
      expect(compareOutput("hello", "hello", "floating_point_tolerance")).toBe(false);
    });
  });
});
