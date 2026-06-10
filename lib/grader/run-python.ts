import "server-only";

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

export type PythonRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  timedOut: boolean;
};

type RunPythonInput = {
  sourceCode: string;
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb?: number | null;
};

let dockerAvailability: boolean | null = null;

async function commandExists(command: string) {
  try {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    const [code] = (await once(child, "close")) as [number | null];
    return code === 0;
  } catch {
    return false;
  }
}

async function resolveRuntime() {
  const configuredRuntime = process.env.GRADING_RUNTIME ?? "auto";
  if (configuredRuntime === "local") {
    return "local" as const;
  }

  if (configuredRuntime === "docker") {
    return "docker" as const;
  }

  if (dockerAvailability === null) {
    dockerAvailability = await commandExists("docker");
  }

  return dockerAvailability ? ("docker" as const) : ("local" as const);
}

async function collectProcessResult(
  processRef: ReturnType<typeof spawn>,
  stdin: string,
  timeLimitMs: number,
) {
  const start = Date.now();

  return await new Promise<PythonRunResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      processRef.kill();
    }, timeLimitMs);

    processRef.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    processRef.stderr?.on("data", (chunk) => {
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

    processRef.stdin?.write(stdin);
    processRef.stdin?.end();
  });
}

async function runWithLocalPython(scriptPath: string, workspace: string, stdin: string, timeLimitMs: number) {
  const processRef = spawn("python", [scriptPath], {
    cwd: workspace,
    stdio: "pipe",
  });

  return collectProcessResult(processRef, stdin, timeLimitMs);
}

async function runWithDocker(
  workspace: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitMb: number | null | undefined,
) {
  const stdinPath = path.join(workspace, "stdin.txt");
  await fs.writeFile(stdinPath, stdin, "utf8");

  const image = process.env.PYTHON_DOCKER_IMAGE ?? "python:3.12-alpine";
  const memoryLimit = `${memoryLimitMb ?? 128}m`;

  const processRef = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--memory",
      memoryLimit,
      "--cpus",
      "1",
      "--pids-limit",
      "64",
      "--read-only",
      "-v",
      `${workspace}:/workspace`,
      "-w",
      "/workspace",
      image,
      "sh",
      "-lc",
      "python /workspace/main.py < /workspace/stdin.txt",
    ],
    {
      stdio: "pipe",
    },
  );

  return collectProcessResult(processRef, "", timeLimitMs);
}

export async function runPythonCode({
  sourceCode,
  stdin,
  timeLimitMs,
  memoryLimitMb,
}: RunPythonInput) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-grader-"));
  const scriptPath = path.join(workspace, "main.py");
  await fs.writeFile(scriptPath, sourceCode, "utf8");

  try {
    const runtime = await resolveRuntime();
    if (runtime === "docker") {
      try {
        return await runWithDocker(workspace, stdin, timeLimitMs, memoryLimitMb);
      } catch {
        return await runWithLocalPython(scriptPath, workspace, stdin, timeLimitMs);
      }
    }

    return await runWithLocalPython(scriptPath, workspace, stdin, timeLimitMs);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
