import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("migration adoption contract", () => {
  test("adopts verified pre-rename schemas only through the workspace rename", async () => {
    const source = await readFile(new URL("./migrate.ts", import.meta.url), "utf8");

    expect(source).toContain('RENAME TO "workspace_members"');
    expect(source).toContain("migration.sql.some");
    expect(source).toContain("classroom_schema_complete");
    expect(source).toContain("workspace_schema_complete");
    expect(source).toContain("recordThrough(workspaceRenameIndex");
    expect(source).toContain("workspace_assignment_schema_complete");
    expect(source).toContain("recordThrough(assignmentRemovalIndex");
    expect(source).toContain("assignment removal migration is missing");
    expect(source).toContain("partial ownership schema");
    expect(source).toContain("unknown Drizzle migration history");
  });
});
