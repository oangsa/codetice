import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

function functionSource(source: string, start: string, end: string) {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

describe("enabled language visibility", () => {
  test("public selectors and submissions do not require a pre-marked ready runtime", () => {
    const service = readFileSync(resolve(root, "server/languages/service.ts"), "utf8");
    const publicList = functionSource(
      service,
      "export async function listPublicLanguagesPage",
      "export async function listAdminLanguagesPage",
    );
    const supportedList = functionSource(
      service,
      "export async function listSupportedLanguages",
      "export async function listEnabledLanguageOptions",
    );
    const submissions = readFileSync(resolve(root, "server/submissions/commands.ts"), "utf8");

    expect(publicList).not.toContain("runtimeStatus");
    expect(supportedList).not.toContain("runtimeStatus");
    expect(submissions).not.toContain("runtimeStatus");
  });

  test("the grading worker prepares the selected runtime before executing code", () => {
    const worker = readFileSync(resolve(root, "server/grading/worker.ts"), "utf8");
    const claimedJob = functionSource(
      worker,
      "async function processClaimedGradingJob",
      "export async function processGradingJob",
    );

    expect(claimedJob).toContain("prepareEnabledLanguageRuntime(language)");
    expect(claimedJob.indexOf("prepareEnabledLanguageRuntime(language)")).toBeLessThan(
      claimedJob.indexOf("gradeCode({"),
    );
  });
});
