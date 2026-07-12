import { describe, expect, test } from "bun:test";

describe("sandbox work ownership", () => {
  test("queues Docker work for the worker and clears transient source", async () => {
    const route = await Bun.file(new URL("../../app/api/workspaces/[id]/run-sample/route.ts", import.meta.url)).text();
    const worker = await Bun.file(new URL("./sandbox-worker.ts", import.meta.url)).text();

    expect(route).not.toContain("runSampleSubmission");
    expect(route).toContain("enqueueSampleJob");
    expect(worker).toContain("prepareEnabledLanguageRuntime");
    expect(worker).toContain("sourceCode: null");
    expect(worker).toContain("renewSandboxJobLease");
  });
});
