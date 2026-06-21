import { describe, expect, test } from "bun:test";

import { buildDockerRunArgs } from "./run-python";

describe("buildDockerRunArgs", () => {
  test("runs the language runtime directly without shell evaluation", () => {
    const args = buildDockerRunArgs({
      workspace: "/tmp/vibe-grader-test",
      memoryLimit: "128m",
      dockerImage: "python:3.12-alpine",
      command: "python",
      args: ["/workspace/main.py"],
    });

    expect(args).toContain("python:3.12-alpine");
    expect(args).toContain("python");
    expect(args).toContain("/workspace/main.py");
    expect(args).not.toContain("/bin/sh");
    expect(args).not.toContain("-c");
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
    expect(args).toContain("/tmp:rw,noexec,nosuid,size=64m");
    expect(args).toContain("/tmp/vibe-grader-test:/workspace:ro");
  });
});
