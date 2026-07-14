import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("uses the standalone server for production start", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
    scripts?: Record<string, string>;
  };

  expect(packageJson.scripts?.start).toBe("bun .next/standalone/server.js");
});

test("prepares public assets for the standalone server during production builds", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
    scripts?: Record<string, string>;
  };

  expect(packageJson.scripts?.build).toContain("prepare-standalone");
});

test("copies module dependencies before compiling the grading worker", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");

  expect(dockerfile).toContain("COPY modules/ ./modules/");
});
