export function normalizeOutput(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

export function compareOutput(actual: string, expected: string) {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
