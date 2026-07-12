import { describe, expect, test } from "bun:test";

import {
  buildDockerBuilderArgs,
  buildDockerBatchRunArgs,
  buildDockerRunArgs,
  HarnessProtocolParser,
  resolveRuntimeConfig,
  resolveRunCommand,
  runCode,
  runCodeBatch,
} from "./run-code";

describe("resolveRuntimeConfig", () => {
  test("normalizes legacy combined compiler commands before Docker execution", () => {
    expect(resolveRuntimeConfig({
      fileExtension: "cpp",
      buildCommand: null,
      runCommand: "g++ {file} -O2 -o /workspace/main && /workspace/main",
      dockerImage: "gcc:14",
    })).toEqual({
      fileName: "main.cpp",
      dockerImage: "gcc:14",
      resolvedBuildCommand: "g++ /workspace/main.cpp -O2 -o /tmp/main",
      resolvedRunCommand: "/tmp/main",
    });
  });
});

describe("buildDockerRunArgs", () => {
  test("runs the database-configured command through the container shell", () => {
    const args = buildDockerRunArgs({
      workspace: "/tmp/vibe-grader-test",
      memoryLimit: "128m",
      dockerImage: "rust:1.83-alpine",
      command: "/bin/sh",
      args: ["-c", "rustc /workspace/main.rs -o /tmp/main && /tmp/main"],
    });

    expect(args).toContain("rust:1.83-alpine");
    expect(args).toContain("/bin/sh");
    expect(args).toContain("-c");
    expect(args).toContain("rustc /workspace/main.rs -o /tmp/main && /tmp/main");
  });

  test("uses hardened container options and a read-only workspace mount", () => {
    const args = buildDockerRunArgs({
      workspace: "/tmp/vibe-grader-test",
      memoryLimit: "128m",
      dockerImage: "python:3.12-alpine",
      command: "python",
      args: ["/workspace/main.py"],
    });

    expect(args).toContain("--network");
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("--memory-swap");
    expect(args).toContain("fsize=67108864:67108864");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("--security-opt");
    expect(args).toContain("no-new-privileges");
    expect(args).toContain("/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777");
    expect(args).toContain("/tmp/vibe-grader-test:/workspace:ro");
    expect(args).toContain("--user");
    expect(args).toContain("65532:65532");
  });
});

describe("buildDockerBuilderArgs", () => {
  test("builds once as non-root into a dedicated writable artifact directory", () => {
    const args = buildDockerBuilderArgs({
      workspace: "/tmp/source",
      artifactDirectory: "/tmp/artifacts",
      memoryLimit: "128m",
      dockerImage: "rust:1.83-alpine",
      command: "/bin/sh",
      args: ["-c", "rustc /workspace/main.rs -o /tmp/main"],
    });

    expect(args).toContain("65532:65532");
    expect(args).toContain("/tmp/source:/workspace:ro");
    expect(args).toContain("/tmp/artifacts:/tmp:rw");
    expect(args).not.toContain("/tmp/artifacts:/workspace:rw");
  });
});

describe("buildDockerBatchRunArgs", () => {
  test("starts a foreground hardened container with a read-only workspace mount", () => {
    const args = buildDockerBatchRunArgs({
      workspace: "/tmp/vibe-grader-test",
      memoryLimit: "128m",
      dockerImage: "node:22-alpine",
      containerName: "vibe-grader-test",
      command: "/bin/sh",
      args: ["/workspace/grader-harness.sh", "0", "1"],
    });

    expect(args).toContain("run");
    expect(args).toContain("-i");
    expect(args).toContain("--rm");
    expect(args).toContain("--name");
    expect(args).toContain("vibe-grader-test");
    expect(args).toContain("--network");
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("--security-opt");
    expect(args).toContain("no-new-privileges");
    expect(args).toContain("/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777");
    expect(args).toContain("/tmp/vibe-grader-test:/workspace:ro");
    expect(args).toContain("node:22-alpine");
    expect(args).toContain("/workspace/grader-harness.sh");
  });
});

describe("resolveRunCommand", () => {
  test("replaces only the configured file placeholder", () => {
    expect(resolveRunCommand("python {file}", "main.py")).toBe("python /workspace/main.py");
  });

  test("does not rewrite legacy main file names", () => {
    expect(resolveRunCommand("python main.py && node main.js && bun main.ts", "main.rs")).toBe(
      "python main.py && node main.js && bun main.ts",
    );
  });
});

describe("HarnessProtocolParser", () => {
  test("parses testcase output without requiring trailing newlines", () => {
    const parser = new HarnessProtocolParser();
    const output = Buffer.concat([
      Buffer.from("__VIBE_GRADER__ TEST_START 0\n"),
      Buffer.from("__VIBE_GRADER__ TEST_RESULT 0 0 5 3\n"),
      Buffer.from("hello"),
      Buffer.from("err"),
    ]);

    expect(parser.push(output)).toEqual([
      { kind: "test_start", index: 0 },
      { kind: "test_result", index: 0, exitCode: 0, stdout: "hello", stderr: "err" },
    ]);
  });

  test("parses multiline output containing marker-like text", () => {
    const parser = new HarnessProtocolParser();
    const stdout = "a\n__VIBE_GRADER__ TEST_START 99\nb";
    const stderr = "line 1\nline 2";
    const output = Buffer.concat([
      Buffer.from(`__VIBE_GRADER__ TEST_RESULT 2 0 ${Buffer.byteLength(stdout)} ${Buffer.byteLength(stderr)}\n`),
      Buffer.from(stdout),
      Buffer.from(stderr),
    ]);

    expect(parser.push(output)).toEqual([
      { kind: "test_result", index: 2, exitCode: 0, stdout, stderr },
    ]);
  });

  test("parses build failure output", () => {
    const parser = new HarnessProtocolParser();
    const output = Buffer.concat([
      Buffer.from("__VIBE_GRADER__ BUILD_START\n"),
      Buffer.from("__VIBE_GRADER__ BUILD_RESULT 1 0 12\n"),
      Buffer.from("build failed"),
    ]);

    expect(parser.push(output)).toEqual([
      { kind: "build_start" },
      { kind: "build_result", exitCode: 1, stdout: "", stderr: "build failed" },
    ]);
  });
});

describe("python source policy", () => {
  test("blocks import statements before running Docker", async () => {
    const result = await runCode({
      language: "python",
      sourceCode: "import sys\nprint('hello')",
      stdin: "",
      timeLimitMs: 1000,
      fileExtension: "py",
      runCommand: "python {file}",
      dockerImage: "python:3.12-alpine",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Blocked import");
  });

  test("blocks from-import statements before running Docker", async () => {
    const result = await runCode({
      language: "python",
      sourceCode: "from math import sqrt\nprint(sqrt(4))",
      stdin: "",
      timeLimitMs: 1000,
      fileExtension: "py",
      runCommand: "python {file}",
      dockerImage: "python:3.12-alpine",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Blocked import");
  });

  test("blocks dynamic import helpers before running Docker", async () => {
    const result = await runCode({
      language: "python",
      sourceCode: "__import__('math')\nprint('hello')",
      stdin: "",
      timeLimitMs: 1000,
      fileExtension: "py",
      runCommand: "python {file}",
      dockerImage: "python:3.12-alpine",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Blocked import");
  });

  test("blocks batch submissions before running Docker", async () => {
    const results = await runCodeBatch({
      language: "python",
      sourceCode: "import sys\nprint('hello')",
      testcases: [{ stdin: "1\n" }, { stdin: "2\n" }],
      timeLimitMs: 1000,
      fileExtension: "py",
      runCommand: "python {file}",
      dockerImage: "python:3.12-alpine",
    });

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.exitCode === 1)).toBe(true);
    expect(results.every((result) => result.stderr.includes("Blocked import"))).toBe(true);
  });
});
