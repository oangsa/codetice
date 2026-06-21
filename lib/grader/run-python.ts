import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

import { MAX_GRADER_OUTPUT_BYTES } from "@/lib/constants";
import { getRuntimeProfile } from "@/lib/grader/runtime-profiles";

export type PythonRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  timedOut: boolean;
  oomKilled: boolean;
};

type RunPythonInput = {
  language: string;
  sourceCode: string;
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb?: number | null;
  fileExtension?: string | null;
  runCommand?: string | null;
  dockerImage?: string | null;
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
    throw new Error("Local grading runtime is disabled for security reasons.");
  }

  if (dockerAvailability === null) {
    dockerAvailability = await commandExists("docker");
  }

  if (!dockerAvailability) {
    throw new Error("Docker grading runtime is unavailable.");
  }

  return "docker" as const;
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
    let outputLimitExceeded = false;

    const terminate = () => {
      timedOut = true;
      processRef.kill("SIGKILL");
    };

    const timer = setTimeout(() => {
      terminate();
    }, timeLimitMs);

    processRef.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!outputLimitExceeded && Buffer.byteLength(stdout, "utf8") > MAX_GRADER_OUTPUT_BYTES) {
        outputLimitExceeded = true;
        stderr += "\nOutput limit exceeded.";
        terminate();
      }
    });

    processRef.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!outputLimitExceeded && Buffer.byteLength(stderr, "utf8") > MAX_GRADER_OUTPUT_BYTES) {
        outputLimitExceeded = true;
        stderr = stderr.slice(0, MAX_GRADER_OUTPUT_BYTES);
        terminate();
      }
    });

    processRef.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        runtimeMs: Date.now() - start,
        timedOut,
        oomKilled: code === 137 && !timedOut,
      });
    });

    processRef.stdin?.write(stdin);
    processRef.stdin?.end();
  });
}

async function runWithDocker(
  workspace: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitMb: number | null | undefined,
  dockerImage: string,
  command: string,
  args: string[],
) {
  const memoryLimit = `${memoryLimitMb ?? 128}m`;

  const processRef = spawn(
    "docker",
    buildDockerRunArgs({
      workspace,
      memoryLimit,
      dockerImage,
      command,
      args,
    }),
    {
      stdio: "pipe",
    },
  );

  return collectProcessResult(processRef, stdin, timeLimitMs);
}

export function buildDockerRunArgs({
  workspace,
  memoryLimit,
  dockerImage,
  command,
  args,
}: {
  workspace: string;
  memoryLimit: string;
  dockerImage: string;
  command: string;
  args: string[];
}) {
  return [
    "run",
    "-i",
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
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--hostname",
    "grader-sandbox",
    "--env",
    "PYTHONDONTWRITEBYTECODE=1",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "-v",
    `${workspace}:/workspace:ro`,
    "-w",
    "/workspace",
    dockerImage,
    command,
    ...args,
  ];
}

export async function runPythonCode(input: RunPythonInput) {
  const profile = getRuntimeProfile(input.language);

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-grader-"));
  const fileName = `main.${profile.fileExtension}`;
  const scriptPath = path.join(workspace, fileName);
  await fs.writeFile(scriptPath, input.sourceCode, "utf8");

  try {
    const runtime = await resolveRuntime();
    if (runtime !== "docker") {
      throw new Error("Unsupported grading runtime.");
    }

    return await runWithDocker(
      workspace,
      input.stdin,
      input.timeLimitMs,
      input.memoryLimitMb,
      profile.dockerImage,
      profile.command,
      profile.args,
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
