import type { Testcase } from "@/db/schema";

export function normalizeOutput(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

function normalizeAllWhitespace(value: string) {
  return value.replace(/\s+/g, "");
}

function compareFloatingPoint(
  actual: string,
  expected: string,
  tolerance: number,
) {
  const actualTokens = normalizeOutput(actual).split(/\s+/);
  const expectedTokens = normalizeOutput(expected).split(/\s+/);

  if (actualTokens.length !== expectedTokens.length) {
    return false;
  }

  return actualTokens.every((token, index) => {
    const actualNumber = Number(token);
    const expectedNumber = Number(expectedTokens[index]);

    if (Number.isNaN(actualNumber) || Number.isNaN(expectedNumber)) {
      return false;
    }

    return Math.abs(actualNumber - expectedNumber) <= tolerance;
  });
}

export function compareOutput(
  actual: string,
  expected: string,
  checkerType: Testcase["checkerType"] = "exact",
  floatTolerance?: string | number | null,
) {
  if (checkerType === "ignore_trailing_whitespace") {
    return normalizeOutput(actual) === normalizeOutput(expected);
  }

  if (checkerType === "ignore_all_whitespace") {
    return normalizeAllWhitespace(actual) === normalizeAllWhitespace(expected);
  }

  if (checkerType === "floating_point_tolerance") {
    return compareFloatingPoint(actual, expected, Number(floatTolerance ?? 0.000001));
  }

  return normalizeOutput(actual) === normalizeOutput(expected);
}
