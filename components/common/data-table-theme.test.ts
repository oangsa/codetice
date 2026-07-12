import { describe, expect, test } from "bun:test";

const componentPath = new URL("./data-table.tsx", import.meta.url);

describe("shared data table theme", () => {
  test("preserves the main question-table surface and contrast classes", async () => {
    const source = await Bun.file(componentPath).text();

    expect(source).toContain("border-slate-200 bg-[var(--tint-sm)]");
    expect(source).toContain("dark:border-slate-800/60");
    expect(source).toContain("text-slate-700");
    expect(source).toContain("text-slate-400");
    expect(source).toContain("hover:bg-black/[0.03] dark:hover:bg-white/[0.03]");
  });
});
