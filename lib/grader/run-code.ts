import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

import { MAX_GRADER_OUTPUT_BYTES } from "@/lib/grader.constants";
import { AppError, ErrorCode, Messages } from "@/lib/errors";

export type CodeRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  timedOut: boolean;
  oomKilled: boolean;
};

type RunCodeInput = {
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

function validatePythonSourcePolicy(sourceCode: string) {
  const importStatementPattern = /(^|\n)\s*(?:from\s+[\w.]+\s+import\b|import\s+[\w.]+)/m;
  if (importStatementPattern.test(sourceCode)) {
    return "Blocked import. Python submissions cannot use imports.";
  }

  const dynamicImportPattern = /\b(?:__import__|import_module)\s*\(/;
  if (dynamicImportPattern.test(sourceCode)) {
    return "Blocked import. Python submissions cannot use imports.";
  }

  return null;
}

function validateSourcePolicy(input: RunCodeInput) {
  if (input.language === "python") {
    return validatePythonSourcePolicy(input.sourceCode);
  }

  return null;
}

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
    throw new AppError(Messages.gradingDisabled, 503, ErrorCode.UNAVAILABLE);
  }

  if (dockerAvailability === null) {
    dockerAvailability = await commandExists("docker");
  }

  if (!dockerAvailability) {
    throw new AppError(Messages.gradingUnavailable, 503, ErrorCode.UNAVAILABLE);
  }

  return "docker" as const;
}

async function collectProcessResult(
  processRef: ReturnType<typeof spawn>,
  stdin: string,
  timeLimitMs: number,
) {
  const start = Date.now();

  return await new Promise<CodeRunResult>((resolve) => {
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

async function makeWorkspaceReadable(workspace: string, scriptPath: string) {
  await fs.chmod(workspace, 0o755);
  await fs.chmod(scriptPath, 0o644);
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
    "/tmp:rw,exec,nosuid,size=64m,mode=1777",
    "-v",
    `${workspace}:/workspace:ro`,
    "-w",
    "/workspace",
    dockerImage,
    command,
    ...args,
  ];
}

export async function runCode(input: RunCodeInput) {
  const policyError = validateSourcePolicy(input);
  if (policyError) {
    return {
      stdout: "",
      stderr: policyError,
      exitCode: 1,
      runtimeMs: 0,
      timedOut: false,
      oomKilled: false,
    };
  }

  const extension = input.fileExtension?.trim();
  if (!extension) {
    throw new AppError(Messages.langMissingFileExt, 500, ErrorCode.INTERNAL);
  }

  const dockerImage = input.dockerImage?.trim();
  if (!dockerImage) {
    throw new AppError(Messages.langMissingDockerImage, 500, ErrorCode.INTERNAL);
  }

  const runCommand = input.runCommand?.trim();
  if (!runCommand) {
    throw new AppError(Messages.langMissingRunCommand, 500, ErrorCode.INTERNAL);
  }

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-grader-"));
  const fileName = `main.${extension}`;
  const scriptPath = path.join(workspace, fileName);
  await fs.writeFile(scriptPath, input.sourceCode, "utf8");
  await makeWorkspaceReadable(workspace, scriptPath);

  try {
    const runtime = await resolveRuntime();
    if (runtime !== "docker") {
      throw new AppError(Messages.gradingMisconfigured, 500, ErrorCode.INTERNAL);
    }

    const workspaceFileName = `/workspace/${fileName}`;
    const resolvedRunCommand = runCommand
      .replaceAll("{file}", workspaceFileName)
      .replaceAll("main.py", fileName)
      .replaceAll("main.js", fileName)
      .replaceAll("main.ts", fileName);

    return await runWithDocker(
      workspace,
      input.stdin,
      input.timeLimitMs,
      input.memoryLimitMb,
      dockerImage,
      "/bin/sh",
      ["-c", resolvedRunCommand],
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
