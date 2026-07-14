import { describe, expect, test } from "bun:test";

import { requiresPreparedRuntimeForDiagnostics } from "./diagnostics-readiness";

describe("diagnostics runtime readiness", () => {
  test("allows local and no-op diagnostics while runtime verification is pending", () => {
    expect(requiresPreparedRuntimeForDiagnostics("none")).toBe(false);
    expect(requiresPreparedRuntimeForDiagnostics("pyright")).toBe(false);
  });

  test("requires a prepared image for compiler diagnostics", () => {
    expect(requiresPreparedRuntimeForDiagnostics("compiler")).toBe(true);
  });
});
