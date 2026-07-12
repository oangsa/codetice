import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("language runtime verification copy", () => {
  test("does not claim the request is preparing a runtime that only the worker verifies", async () => {
    const source = await readFile(
      new URL("../../modules/admin/components/language-manager.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('pending ? "Saving..."');
    expect(source).not.toContain("Preparing runtime...");
    expect(source).toContain("runtime verification is pending");
    expect(source).not.toContain("runtime stays unavailable");
    expect(source).not.toContain("before students can use it");
    expect(source).toContain("remain available while verification is pending");
  });
});
