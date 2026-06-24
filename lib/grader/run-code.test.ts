import { describe, expect, test } from "bun:test";

import { buildDockerRunArgs, resolveRunCommand, runCode } from "./run-code";

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
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("--security-opt");
    expect(args).toContain("no-new-privileges");
    expect(args).toContain("/tmp:rw,exec,nosuid,size=64m,mode=1777");
    expect(args).toContain("/tmp/vibe-grader-test:/workspace:ro");
  });
});

describe("compiled language run commands", () => {
  test("supports explicit writable binary placeholder", () => {
    expect(resolveRunCommand("gcc {file} -o {binary} && {binary}", "main.c")).toBe(
      "gcc /workspace/main.c -o /tmp/main && /tmp/main",
    );
  });

  test("keeps common compiled-language commands away from read-only workspace", () => {
    expect(resolveRunCommand("gcc {file} -o main && ./main", "main.c")).toBe(
      "gcc /workspace/main.c -o /tmp/main && /tmp/main",
    );
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
});
