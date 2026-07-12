import { spawn } from "node:child_process";
import { once } from "node:events";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateDockerImage } from "@/server/languages/docker-image";
import { validateRuntimeCommands } from "@/server/languages/runtime-config";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { MAX_GRADER_OUTPUT_BYTES } from "@/server/grading/constants";

export type CodeRunFailureKind = "none" | "compile_error" | "infrastructure_error";

export type CodeRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  timedOut: boolean;
  oomKilled: boolean;
  failureKind: CodeRunFailureKind;
};

type RunCodeInput = {
  language: string;
  sourceCode: string;
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb?: number | null;
  fileExtension?: string | null;
  buildCommand?: string | null;
  runCommand?: string | null;
  dockerImage?: string | null;
  signal?: AbortSignal;
};

type RunCodeBatchInput = Omit<RunCodeInput, "stdin"> & {
  testcases: Array<{ stdin: string }>;
};

type RuntimeConfig = {
  fileName: string;
  dockerImage: string;
  resolvedBuildCommand: string | null;
  resolvedRunCommand: string;
};

type HarnessEvent =
  | { kind: "build_start" }
  | { kind: "build_result"; exitCode: number; stdout: string; stderr: string }
  | { kind: "test_start"; index: number }
  | { kind: "test_result"; index: number; exitCode: number; stdout: string; stderr: string };

const SANDBOX_USER = "65532:65532";
const BUILD_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;
const HARNESS_PREFIX = "__VIBE_GRADER__";

let dockerAvailability: boolean | null = null;

function validatePythonSourcePolicy(sourceCode: string) {
  const importStatementPattern = /(^|\n)\s*(?:from\s+[\w.]+\s+import\b|import\s+[\w.]+)/m;
  if (importStatementPattern.test(sourceCode)) {
    return "Blocked import. Python submissions cannot use imports.";
  }
  if (/\b(?:__import__|import_module)\s*\(/.test(sourceCode)) {
    return "Blocked import. Python submissions cannot use imports.";
  }
  return null;
}

function validateSourcePolicy(input: Pick<RunCodeInput, "language" | "sourceCode">) {
  return input.language === "python" ? validatePythonSourcePolicy(input.sourceCode) : null;
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
  if ((process.env.GRADING_RUNTIME ?? "auto") === "local") {
    throw new AppError(Messages.gradingDisabled, 503, ErrorCode.UNAVAILABLE);
  }
  if (dockerAvailability === null) dockerAvailability = await commandExists("docker");
  if (!dockerAvailability) {
    throw new AppError(Messages.gradingUnavailable, 503, ErrorCode.UNAVAILABLE);
  }
}

function hardenedDockerArgs(memoryLimit: string) {
  return [
    "--network", "none",
    "--memory", memoryLimit,
    "--memory-swap", memoryLimit,
    "--cpus", "1",
    "--pids-limit", "64",
    "--ulimit", "nofile=64:64",
    "--ulimit", "nproc=32:32",
    "--ulimit", "fsize=67108864:67108864",
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--user", SANDBOX_USER,
    "--hostname", "grader-sandbox",
    "--env", "PYTHONDONTWRITEBYTECODE=1",
  ];
}

export function buildDockerRunArgs({
  workspace,
  artifactDirectory,
  memoryLimit,
  dockerImage,
  containerName,
  command,
  args,
}: {
  workspace: string;
  artifactDirectory?: string | null;
  memoryLimit: string;
  dockerImage: string;
  containerName?: string;
  command: string;
  args: string[];
}) {
  validateDockerImage(dockerImage);
  return [
    "run", "-i", "--rm",
    ...(containerName ? ["--name", containerName] : []),
    ...hardenedDockerArgs(memoryLimit),
    "--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777",
    "-v", `${workspace}:/workspace:ro`,
    ...(artifactDirectory ? ["-v", `${artifactDirectory}:/artifacts:ro`] : []),
    "-w", "/workspace",
    dockerImage,
    command,
    ...args,
  ];
}

export function buildDockerBuilderArgs({
  workspace,
  artifactDirectory,
  memoryLimit,
  dockerImage,
  containerName,
  command,
  args,
}: {
  workspace: string;
  artifactDirectory: string;
  memoryLimit: string;
  dockerImage: string;
  containerName?: string;
  command: string;
  args: string[];
}) {
  validateDockerImage(dockerImage);
  return [
    "run", "-i", "--rm",
    ...(containerName ? ["--name", containerName] : []),
    ...hardenedDockerArgs(memoryLimit),
    "-v", `${workspace}:/workspace:ro`,
    "-v", `${artifactDirectory}:/tmp:rw`,
    "-w", "/workspace",
    dockerImage,
    command,
    ...args,
  ];
}

/** Kept for callers/tests while batch execution now starts one runner per testcase. */
export function buildDockerBatchRunArgs(input: {
  workspace: string;
  memoryLimit: string;
  dockerImage: string;
  containerName: string;
  command: string;
  args: string[];
}) {
  return buildDockerRunArgs(input);
}

export function resolveRunCommand(runCommand: string, fileName: string) {
  return runCommand.replaceAll("{file}", `/workspace/${fileName}`);
}

export class HarnessProtocolParser {
  private buffer = Buffer.alloc(0);
  private pending:
    | { kind: "build_result"; exitCode: number; stdoutLength: number; stderrLength: number; stdout?: Buffer }
    | { kind: "test_result"; index: number; exitCode: number; stdoutLength: number; stderrLength: number; stdout?: Buffer }
    | null = null;

  push(chunk: Buffer) {
    const events: HarnessEvent[] = [];
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      if (this.pending) {
        const pending = this.pending;
        if (!pending.stdout) {
          if (this.buffer.length < pending.stdoutLength) break;
          pending.stdout = this.buffer.subarray(0, pending.stdoutLength);
          this.buffer = this.buffer.subarray(pending.stdoutLength);
        }
        if (this.buffer.length < pending.stderrLength) break;
        const stderr = this.buffer.subarray(0, pending.stderrLength);
        this.buffer = this.buffer.subarray(pending.stderrLength);
        this.pending = null;
        if (pending.kind === "build_result") {
          events.push({ kind: "build_result", exitCode: pending.exitCode, stdout: pending.stdout.toString(), stderr: stderr.toString() });
        } else {
          events.push({ kind: "test_result", index: pending.index, exitCode: pending.exitCode, stdout: pending.stdout.toString(), stderr: stderr.toString() });
        }
        continue;
      }
      const newline = this.buffer.indexOf(10);
      if (newline === -1) break;
      const parts = this.buffer.subarray(0, newline).toString().split(" ");
      this.buffer = this.buffer.subarray(newline + 1);
      if (parts[0] !== HARNESS_PREFIX) continue;
      if (parts[1] === "BUILD_START") events.push({ kind: "build_start" });
      else if (parts[1] === "TEST_START" && Number.isInteger(Number(parts[2]))) {
        events.push({ kind: "test_start", index: Number(parts[2]) });
      } else if (parts[1] === "BUILD_RESULT") {
        const values = parts.slice(2, 5).map(Number);
        if (values.every(Number.isInteger)) {
          this.pending = { kind: "build_result", exitCode: values[0]!, stdoutLength: values[1]!, stderrLength: values[2]! };
        }
      } else if (parts[1] === "TEST_RESULT") {
        const values = parts.slice(2, 6).map(Number);
        if (values.every(Number.isInteger)) {
          this.pending = { kind: "test_result", index: values[0]!, exitCode: values[1]!, stdoutLength: values[2]!, stderrLength: values[3]! };
        }
      }
    }
    return events;
  }
}

function result(input: Partial<CodeRunResult> = {}): CodeRunResult {
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    runtimeMs: 0,
    timedOut: false,
    oomKilled: false,
    failureKind: "none",
    ...input,
  };
}

export function resolveRuntimeConfig(input: Pick<RunCodeInput, "fileExtension" | "buildCommand" | "runCommand" | "dockerImage">): RuntimeConfig {
  const extension = input.fileExtension?.trim();
  if (!extension) throw new AppError(Messages.langMissingFileExt, 500, ErrorCode.INTERNAL);
  const dockerImage = input.dockerImage?.trim();
  if (!dockerImage) throw new AppError(Messages.langMissingDockerImage, 500, ErrorCode.INTERNAL);
  validateDockerImage(dockerImage);
  const runCommand = input.runCommand?.trim();
  if (!runCommand) throw new AppError(Messages.langMissingRunCommand, 500, ErrorCode.INTERNAL);
  const fileName = `main.${extension}`;
  const commands = validateRuntimeCommands({
    buildCommand: input.buildCommand,
    runCommand,
  });
  return {
    fileName,
    dockerImage,
    resolvedBuildCommand: commands.buildCommand ? resolveRunCommand(commands.buildCommand, fileName) : null,
    resolvedRunCommand: resolveRunCommand(commands.runCommand, fileName),
  };
}

async function createWorkspace(fileName: string, sourceCode: string) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "codetice-source-"));
  await fs.writeFile(path.join(workspace, fileName), sourceCode, { encoding: "utf8", mode: 0o644 });
  await fs.chmod(workspace, 0o755);
  return workspace;
}

async function directorySize(directory: string): Promise<number> {
  let total = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    total += entry.isDirectory() ? await directorySize(entryPath) : (await fs.stat(entryPath)).size;
  }
  return total;
}

async function removeContainer(containerName: string) {
  const child = spawn("docker", ["rm", "-f", containerName], { stdio: "ignore" });
  await new Promise<void>((resolve) => {
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
}

async function runDockerProcess(input: {
  args: string[];
  containerName: string;
  stdin: string;
  timeoutMs: number;
  timeoutFailureKind: CodeRunFailureKind;
  artifactDirectory?: string;
  signal?: AbortSignal;
}) {
  const child = spawn("docker", input.args, { stdio: "pipe" });
  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let artifactLimitExceeded = false;
  let aborted = false;
  let outputExceeded = false;
  const maxArtifacts = Math.max(1, Number(process.env.GRADING_MAX_ARTIFACT_BYTES ?? DEFAULT_MAX_ARTIFACT_BYTES));

  const terminate = () => child.kill("SIGKILL");
  const timer = setTimeout(() => {
    timedOut = true;
    terminate();
  }, input.timeoutMs);
  const artifactTimer = input.artifactDirectory ? setInterval(() => {
    void directorySize(input.artifactDirectory!).then((size) => {
      if (size > maxArtifacts) {
        artifactLimitExceeded = true;
        terminate();
      }
    }).catch(() => undefined);
  }, 100) : null;
  const abort = () => {
    aborted = true;
    terminate();
  };
  input.signal?.addEventListener("abort", abort, { once: true });

  const append = (current: string, chunk: Buffer) => {
    const combined = Buffer.concat([Buffer.from(current, "utf8"), chunk]);
    return combined.subarray(0, MAX_GRADER_OUTPUT_BYTES).toString("utf8");
  };
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout = append(stdout, chunk);
    if (Buffer.byteLength(stdout, "utf8") >= MAX_GRADER_OUTPUT_BYTES && !outputExceeded) {
      outputExceeded = true;
      terminate();
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr = append(stderr, chunk);
    if (Buffer.byteLength(stderr, "utf8") >= MAX_GRADER_OUTPUT_BYTES && !outputExceeded) {
      outputExceeded = true;
      terminate();
    }
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code));
    child.stdin?.end(input.stdin);
  });

  clearTimeout(timer);
  if (artifactTimer) clearInterval(artifactTimer);
  input.signal?.removeEventListener("abort", abort);
  await removeContainer(input.containerName);

  const unexpectedMissingExit = exitCode === null
    && !timedOut
    && !artifactLimitExceeded
    && !outputExceeded
    && !aborted;
  const infrastructure = aborted || unexpectedMissingExit || exitCode === 125;
  return result({
    stdout,
    stderr: [
      stderr,
      artifactLimitExceeded ? "Build artifact limit exceeded." : "",
      outputExceeded ? "Output limit exceeded." : "",
      aborted ? "Grading lease was lost." : "",
    ].filter(Boolean).join("\n"),
    exitCode,
    runtimeMs: Date.now() - startedAt,
    timedOut,
    oomKilled: exitCode === 137 && !timedOut,
    failureKind: infrastructure
      ? "infrastructure_error"
      : timedOut || artifactLimitExceeded
        ? input.timeoutFailureKind
        : "none",
  });
}

async function runBuilder(
  workspace: string,
  artifactDirectory: string,
  config: RuntimeConfig,
  memoryLimitMb: number | null | undefined,
  signal?: AbortSignal,
) {
  validateDockerImage(config.dockerImage);
  const containerName = `codetice-build-${crypto.randomUUID()}`;
  const build = await runDockerProcess({
    args: buildDockerBuilderArgs({
      workspace,
      artifactDirectory,
      memoryLimit: `${memoryLimitMb ?? 128}m`,
      dockerImage: config.dockerImage,
      containerName,
      command: "/bin/sh",
      args: ["-c", config.resolvedBuildCommand!],
    }),
    containerName,
    stdin: "",
    timeoutMs: BUILD_TIMEOUT_MS,
    timeoutFailureKind: "compile_error",
    artifactDirectory,
    signal,
  });
  if (build.failureKind === "none" && build.exitCode !== 0) build.failureKind = "compile_error";
  const maxArtifacts = Math.max(1, Number(process.env.GRADING_MAX_ARTIFACT_BYTES ?? DEFAULT_MAX_ARTIFACT_BYTES));
  if (build.failureKind === "none" && await directorySize(artifactDirectory) > maxArtifacts) {
    build.failureKind = "compile_error";
    build.stderr = "Build artifact limit exceeded.";
    build.exitCode = 1;
  }
  return build;
}

async function runTestcase(input: {
  workspace: string;
  artifactDirectory: string | null;
  config: RuntimeConfig;
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb?: number | null;
  signal?: AbortSignal;
}) {
  validateDockerImage(input.config.dockerImage);
  const containerName = `codetice-run-${crypto.randomUUID()}`;
  const copyArtifacts = input.artifactDirectory ? "cp -a /artifacts/. /tmp/ && " : "";
  return runDockerProcess({
    args: buildDockerRunArgs({
      workspace: input.workspace,
      artifactDirectory: input.artifactDirectory,
      memoryLimit: `${input.memoryLimitMb ?? 128}m`,
      dockerImage: input.config.dockerImage,
      containerName,
      command: "/bin/sh",
      args: ["-c", `${copyArtifacts}cd /workspace && ${input.config.resolvedRunCommand}`],
    }),
    containerName,
    stdin: input.stdin,
    timeoutMs: input.timeLimitMs,
    timeoutFailureKind: "none",
    signal: input.signal,
  });
}

export async function runCode(input: RunCodeInput) {
  const [run] = await runCodeBatch({ ...input, testcases: [{ stdin: input.stdin }] });
  return run ?? result({ exitCode: null, stderr: Messages.gradingUnavailable, failureKind: "infrastructure_error" });
}

export async function runCodeBatch(input: RunCodeBatchInput) {
  if (input.testcases.length === 0) return [];
  const policyError = validateSourcePolicy(input);
  if (policyError) return input.testcases.map(() => result({ exitCode: 1, stderr: policyError }));

  const config = resolveRuntimeConfig(input);
  const workspace = await createWorkspace(config.fileName, input.sourceCode);
  const artifactDirectory = config.resolvedBuildCommand
    ? await fs.mkdtemp(path.join(os.tmpdir(), "codetice-artifacts-"))
    : null;
  if (artifactDirectory) await fs.chmod(artifactDirectory, 0o777);

  try {
    await resolveRuntime();
    if (artifactDirectory) {
      const build = await runBuilder(workspace, artifactDirectory, config, input.memoryLimitMb, input.signal);
      if (build.failureKind !== "none" || build.exitCode !== 0) {
        return input.testcases.map(() => ({ ...build }));
      }
    }

    const results: CodeRunResult[] = [];
    for (const testcase of input.testcases) {
      results.push(await runTestcase({
        workspace,
        artifactDirectory,
        config,
        stdin: testcase.stdin,
        timeLimitMs: input.timeLimitMs,
        memoryLimitMb: input.memoryLimitMb,
        signal: input.signal,
      }));
      if (input.signal?.aborted) break;
    }
    while (results.length < input.testcases.length) {
      results.push(result({ exitCode: null, stderr: "Grading lease was lost.", failureKind: "infrastructure_error" }));
    }
    return results;
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
    if (artifactDirectory) await fs.rm(artifactDirectory, { recursive: true, force: true });
  }
}
