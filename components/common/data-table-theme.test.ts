import { describe, expect, test } from "bun:test";

const componentPath = new URL("./data-table.tsx", import.meta.url);

describe("shared data table theme", () => {
  test("uses a compact neutral data-table surface in both themes", async () => {
    const source = await Bun.file(componentPath).text();

    expect(source).toContain("border-slate-200 bg-white");
    expect(source).toContain("dark:border-slate-800 dark:bg-slate-950");
    expect(source).toContain("bg-slate-50/80 dark:bg-slate-900/50");
    expect(source).toContain("[&_td]:px-3 [&_td]:py-2");
    expect(source).toContain("text-slate-500");
    expect(source).toContain("text-slate-400");
    expect(source).toContain("hover:bg-black/[0.03] dark:hover:bg-white/[0.03]");
  });
});
