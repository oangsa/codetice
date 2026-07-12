import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sharedTable = "components/common/data-table.tsx";
const tableSurfaces = [
  "modules/workspaces/components/question-table.tsx",
  "modules/workspaces/components/workspace-tabs.tsx",
  "modules/workspaces/components/member-manager.tsx",
  "modules/submissions/components/submission-table.tsx",
  "modules/admin/components/user-manager.tsx",
  "modules/questions/components/question-form.tsx",
  "modules/submissions/pages/submission-detail-page.tsx",
];

describe("shared data table", () => {
  test("provides the questions-table visual shell", async () => {
    expect(existsSync(resolve(root, sharedTable))).toBe(true);
    const source = await readFile(resolve(root, sharedTable), "utf8");
    expect(source).toContain("rounded-[30px]");
    expect(source).toContain("DataTable");
    expect(source).toContain("DataTablePagination");
    expect(source).toContain("DataTableSearch");
  });

  test("is the only table renderer used by application surfaces", async () => {
    for (const path of tableSurfaces) {
      const source = await readFile(resolve(root, path), "utf8");
      expect(source, path).toContain("<DataTable");
      expect(source, path).not.toContain('from "@/components/ui/table"');
      expect(source, path).not.toMatch(/<Table(?:Head|Header|Body|Row|Cell)?[\s>]/);
    }
  });
});
