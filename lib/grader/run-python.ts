import "server-only";

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export type PythonRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  timedOut: boolean;
};

export async function runPythonCode(sourceCode: string, stdin: string, timeLimitMs: number) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-grader-"));
  const scriptPath = path.join(workspace, "main.py");
  await fs.writeFile(scriptPath, sourceCode, "utf8");

  const start = Date.now();

  try {
    return await new Promise<PythonRunResult>((resolve) => {
      const processRef = spawn("python", [scriptPath], {
        cwd: workspace,
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        processRef.kill();
      }, timeLimitMs);

      processRef.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      processRef.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      processRef.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code,
          runtimeMs: Date.now() - start,
          timedOut,
        });
      });

      processRef.stdin.write(stdin);
      processRef.stdin.end();
    });
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
