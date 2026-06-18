import "server-only";

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export type PyrightDiagnostic = {
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: "error" | "warning" | "information";
};

async function resolvePyrightExecutable() {
  const candidates =
    process.platform === "win32"
      ? [
          path.join(process.cwd(), "node_modules/.bin/pyright.exe"),
          path.join(process.cwd(), "node_modules/.bin/pyright.cmd"),
        ]
      : [path.join(process.cwd(), "node_modules/.bin/pyright")];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return candidates[0];
}

export async function getPyrightDiagnostics(sourceCode: string) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-pyright-"));
  const filePath = path.join(workspace, "main.py");
  await fs.writeFile(filePath, sourceCode, "utf8");

  try {
    const executable = await resolvePyrightExecutable();
    const output = await new Promise<string>((resolve) => {
      const child = spawn(
        executable,
        ["--outputjson", filePath],
        { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", () => {
        resolve(stdout || stderr);
      });

      child.on("error", () => {
        resolve(stderr || stdout);
      });
    });

    const parsed = JSON.parse(output) as {
      generalDiagnostics?: Array<{
        message: string;
        range?: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        severity: "error" | "warning" | "information";
      }>;
    };

    return (parsed.generalDiagnostics ?? []).map((diagnostic) => ({
      message: diagnostic.message,
      line: (diagnostic.range?.start.line ?? 0) + 1,
      column: (diagnostic.range?.start.character ?? 0) + 1,
      endLine: (diagnostic.range?.end.line ?? 0) + 1,
      endColumn: (diagnostic.range?.end.character ?? 0) + 1,
      severity: diagnostic.severity ?? "error",
    })) satisfies PyrightDiagnostic[];
  } catch {
    return [] satisfies PyrightDiagnostic[];
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
