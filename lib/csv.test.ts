import { describe, expect, test } from "bun:test";

import { serializeCsv } from "@/lib/csv";

describe("CSV serialization", () => {
  test("writes UTF-8 spreadsheet-compatible rows with numbers and escaped text", () => {
    const csv = serializeCsv([
      { rank: 1, username: 'Zoë, "Z"', score: 10.5 },
      { rank: 2, username: "line\nbreak", score: 0 },
    ], [
      { header: "Rank", value: (row) => row.rank },
      { header: "Username", value: (row) => row.username },
      { header: "Score", value: (row) => row.score },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('1,"Zoë, ""Z""",10.5');
    expect(csv).toContain('2,"line\nbreak",0');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  test("protects spreadsheet formulas and keeps empty values empty", () => {
    const csv = serializeCsv([
      { value: "=1+1" },
      { value: "  @command" },
      { value: null },
    ], [{ header: "Value", value: (row) => row.value }]);

    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"\'  @command"');
    expect(csv).toContain("\r\n\r\n");
  });
});
