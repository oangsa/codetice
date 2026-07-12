import { describe, expect, test } from "bun:test";

import { createPyrightInvocation } from "@/server/grading/pyright-executable";

describe("Pyright executable resolution", () => {
  test("uses a statically traceable package entrypoint", () => {
    const invocation = createPyrightInvocation(["--outputjson", "/tmp/main.py"]);

    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args[0]).toMatch(/node_modules[\\/]pyright[\\/]index\.js$/);
    expect(invocation.args.slice(1)).toEqual(["--outputjson", "/tmp/main.py"]);
  });
});
