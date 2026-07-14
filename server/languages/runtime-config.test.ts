import { describe, expect, test } from "bun:test";

import { validateRuntimeCommands } from "./runtime-config";

describe("runtime command validation", () => {
  test("accepts interpreted and build-once configurations", () => {
    expect(validateRuntimeCommands({ runCommand: "python {file}" })).toEqual({
      buildCommand: null,
      runCommand: "python {file}",
    });
    expect(validateRuntimeCommands({ runCommand: "python /workspace/main.py" })).toEqual({
      buildCommand: null,
      runCommand: "python /workspace/main.py",
    });
    expect(validateRuntimeCommands({
      buildCommand: "rustc {file} -o /tmp/main",
      runCommand: "/tmp/main",
    })).toEqual({
      buildCommand: "rustc {file} -o /tmp/main",
      runCommand: "/tmp/main",
    });
    expect(validateRuntimeCommands({
      runCommand: "gcc {file} -O2 -std=c17 -o /workspace/main && /workspace/main",
    })).toEqual({
      buildCommand: "gcc {file} -O2 -std=c17 -o /tmp/main",
      runCommand: "/tmp/main",
    });
    expect(validateRuntimeCommands({
      runCommand: "rustc {file} -o /tmp/main && /tmp/main",
    })).toEqual({
      buildCommand: "rustc {file} -o /tmp/main",
      runCommand: "/tmp/main",
    });
  });

  test("rejects commands incompatible with read-only source and copied artifacts", () => {
    expect(() => validateRuntimeCommands({ runCommand: "python main.py" })).toThrow();
    expect(() => validateRuntimeCommands({ runCommand: "python /workspace/../etc/passwd" })).toThrow();
    expect(() => validateRuntimeCommands({ buildCommand: "rustc {file} -o main", runCommand: "./main" })).toThrow();
    expect(() => validateRuntimeCommands({ runCommand: "python {file}\nwhoami" })).toThrow();
  });
});
