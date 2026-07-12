import { describe, expect, test } from "bun:test";

import { runCodeBatch } from "@/server/grading/run-code";

const suite = process.env.RUN_DOCKER_INTEGRATION === "true" ? describe : describe.skip;
const image = process.env.DOCKER_TEST_IMAGE ?? "alpine:3.20";

suite("Docker testcase isolation", () => {
  test("runs every interpreted testcase as non-root with a fresh /tmp", async () => {
    const results = await runCodeBatch({
      language: "shell",
      sourceCode: "printf 'uid=%s\\n' \"$(id -u)\"\nif [ -e /tmp/leak ]; then echo state=leaked; else echo state=fresh; touch /tmp/leak; fi",
      testcases: [{ stdin: "" }, { stdin: "" }],
      timeLimitMs: 2_000,
      memoryLimitMb: 64,
      fileExtension: "sh",
      runCommand: "/bin/sh {file}",
      dockerImage: image,
    });

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("uid=65532");
      expect(result.stdout).toContain("state=fresh");
      expect(result.stdout).not.toContain("state=leaked");
    }
  }, 15_000);

  test("builds a baseline artifact once and gives each runner a private copy", async () => {
    const results = await runCodeBatch({
      language: "compiled-shell-fixture",
      sourceCode: "if [ -e /tmp/runner-state ]; then echo leaked; else echo clean; touch /tmp/runner-state; fi",
      testcases: [{ stdin: "" }, { stdin: "" }],
      timeLimitMs: 2_000,
      memoryLimitMb: 64,
      fileExtension: "sh",
      buildCommand: "cp {file} /tmp/main && chmod +x /tmp/main",
      runCommand: "/bin/sh /tmp/main",
      dockerImage: image,
    });

    expect(results.map((result) => result.stdout.trim())).toEqual(["clean", "clean"]);
  }, 15_000);

  test("keeps output and time bounded", async () => {
    const [timed] = await runCodeBatch({
      language: "shell",
      sourceCode: "while :; do :; done",
      testcases: [{ stdin: "" }],
      timeLimitMs: 100,
      memoryLimitMb: 64,
      fileExtension: "sh",
      runCommand: "/bin/sh {file}",
      dockerImage: image,
    });
    expect(timed?.timedOut).toBe(true);
    expect(timed?.failureKind).toBe("none");
  }, 15_000);

  test("cannot reach the network", async () => {
    const [network] = await runCodeBatch({
      language: "shell",
      sourceCode: "if wget -q -T 1 -O /dev/null http://1.1.1.1; then echo available; else echo blocked; fi",
      testcases: [{ stdin: "" }],
      timeLimitMs: 2_500,
      memoryLimitMb: 64,
      fileExtension: "sh",
      runCommand: "/bin/sh {file}",
      dockerImage: image,
    });
    expect(network?.exitCode).toBe(0);
    expect(network?.stdout.trim()).toBe("blocked");
  }, 15_000);
});
