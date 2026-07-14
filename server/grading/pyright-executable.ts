import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function createPyrightInvocation(args: string[]) {
  return {
    command: process.execPath,
    args: [require.resolve("pyright"), ...args],
  };
}
