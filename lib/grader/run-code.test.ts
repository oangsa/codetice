import { describe, expect, test } from "bun:test";

import { buildDockerRunArgs, runCode } from "./run-code";

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

describe("python source policy", () => {
  test("blocks system module imports before running Docker", async () => {
    const result = await runCode({
      language: "python",
      sourceCode: "import os\nprint(os.name)",
      stdin: "",
      timeLimitMs: 1000,
      fileExtension: "py",
      runCommand: "python {file}",
      dockerImage: "python:3.12-alpine",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Blocked import 'os'");
  });

  test("blocks sensitive sys introspection while allowing sys import", async () => {
    const result = await runCode({
      language: "python",
      sourceCode: "import sys\nprint(sys.version)",
      stdin: "",
      timeLimitMs: 1000,
      fileExtension: "py",
      runCommand: "python {file}",
      dockerImage: "python:3.12-alpine",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Blocked access 'sys.version'");
  });
});
