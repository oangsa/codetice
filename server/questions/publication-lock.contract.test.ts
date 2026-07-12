import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("question publication locking contract", () => {
  test("serializes publication and testcase mutations on the parent question", async () => {
    const source = await readFile(new URL("./mutations.ts", import.meta.url), "utf8");

    expect(source).toContain("async function lockWorkspaceQuestion");
    expect(source).toContain("for update");
    expect(source.match(/await lockWorkspaceQuestion\(tx, workspaceId, questionId\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source.indexOf("await lockWorkspaceQuestion(tx, workspaceId, questionId)")).toBeLessThan(
      source.indexOf("count(*)::int"),
    );
  });
});
