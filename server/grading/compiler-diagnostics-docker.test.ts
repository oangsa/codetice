import { describe, expect, test } from "bun:test";

import { buildCompilerDiagnosticsDockerArgs } from "@/server/grading/compiler-diagnostics-docker";

describe("compiler diagnostics Docker isolation", () => {
  test("uses the same non-root read-only sandbox as grading runners", () => {
    const args = buildCompilerDiagnosticsDockerArgs({
      workspace: "/tmp/source",
      dockerImage: "gcc:14",
      containerName: "diagnostics-test",
      diagnosticsCommand: "gcc -fsyntax-only /workspace/main.c",
    });

    expect(args).toContain("--network");
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("no-new-privileges");
    expect(args).toContain("--user");
    expect(args).toContain("65532:65532");
    expect(args).toContain("/tmp/source:/workspace:ro");
    expect(args).toContain("/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777");
  });
});
