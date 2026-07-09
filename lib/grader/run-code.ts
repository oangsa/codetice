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
  buildCommand?: string | null;
  runCommand?: string | null;
  dockerImage?: string | null;
};

type RunCodeBatchInput = Omit<RunCodeInput, "stdin"> & {
  testcases: Array<{
    stdin: string;
  }>;
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

const DOCKER_START_TIMEOUT_MS = 10_000;
const BUILD_TIMEOUT_MS = 30_000;
const HARNESS_PREFIX = "__VIBE_GRADER__";

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

function validateSourcePolicy(input: Pick<RunCodeInput, "language" | "sourceCode">) {
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
    let settled = false;

    const finish = (result: Omit<CodeRunResult, "runtimeMs">) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        runtimeMs: Date.now() - start,
      });
    };

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

    processRef.on("error", (error) => {
      finish({
        stdout,
        stderr: stderr || error.message,
        exitCode: null,
        timedOut,
        oomKilled: false,
      });
    });

    processRef.on("close", (code) => {
      finish({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
        oomKilled: code === 137 && !timedOut,
      });
    });

    processRef.stdin?.end(stdin);
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

export function buildDockerBatchRunArgs({
  workspace,
  memoryLimit,
  dockerImage,
  containerName,
  command,
  args,
}: {
  workspace: string;
  memoryLimit: string;
  dockerImage: string;
  containerName: string;
  command: string;
  args: string[];
}) {
  return [
    "run",
    "-i",
    "--rm",
    "--name",
    containerName,
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

export function resolveRunCommand(runCommand: string, fileName: string) {
  return runCommand.replaceAll("{file}", `/workspace/${fileName}`);
}

function shellSingleQuote(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function createCommandScript(command: string) {
  return `#!/bin/sh
cd /workspace
${command}
`;
}

function createHarnessScript() {
  return `#!/bin/sh
set +e
PREFIX=${shellSingleQuote(HARNESS_PREFIX)}
MAX_BYTES=${MAX_GRADER_OUTPUT_BYTES}

byte_count() {
  wc -c < "$1" | tr -d ' '
}

emit_file() {
  file="$1"
  size="$2"
  if [ "$size" -gt 0 ]; then
    head -c "$size" "$file"
  fi
}

emit_result() {
  kind="$1"
  index="$2"
  exit_code="$3"
  stdout_file="$4"
  stderr_file="$5"
  stdout_size="$(byte_count "$stdout_file")"
  stderr_size="$(byte_count "$stderr_file")"

  if [ "$stdout_size" -gt "$MAX_BYTES" ] || [ "$stderr_size" -gt "$MAX_BYTES" ]; then
    printf '\\nOutput limit exceeded.\\n' >> "$stderr_file"
    exit_code=1
    stdout_size="$(byte_count "$stdout_file")"
    stderr_size="$(byte_count "$stderr_file")"
  fi

  stdout_emit_size="$stdout_size"
  stderr_emit_size="$stderr_size"
  if [ "$stdout_emit_size" -gt "$MAX_BYTES" ]; then
    stdout_emit_size="$MAX_BYTES"
  fi
  if [ "$stderr_emit_size" -gt "$MAX_BYTES" ]; then
    stderr_emit_size="$MAX_BYTES"
  fi

  if [ "$kind" = "build" ]; then
    printf '%s BUILD_RESULT %s %s %s\\n' "$PREFIX" "$exit_code" "$stdout_emit_size" "$stderr_emit_size"
  else
    printf '%s TEST_RESULT %s %s %s %s\\n' "$PREFIX" "$index" "$exit_code" "$stdout_emit_size" "$stderr_emit_size"
  fi
  emit_file "$stdout_file" "$stdout_emit_size"
  emit_file "$stderr_file" "$stderr_emit_size"
}

if [ -f /workspace/build.sh ]; then
  printf '%s BUILD_START\\n' "$PREFIX"
  sh /workspace/build.sh > /tmp/vibe-grader-build.stdout 2> /tmp/vibe-grader-build.stderr
  build_exit="$?"
  emit_result build "" "$build_exit" /tmp/vibe-grader-build.stdout /tmp/vibe-grader-build.stderr
  rm -f /tmp/vibe-grader-build.stdout /tmp/vibe-grader-build.stderr
  if [ "$build_exit" -ne 0 ]; then
    exit 0
  fi
fi

for index in "$@"; do
  printf '%s TEST_START %s\\n' "$PREFIX" "$index"
  stdout_file="/tmp/vibe-grader-test-$index.stdout"
  stderr_file="/tmp/vibe-grader-test-$index.stderr"
  sh /workspace/run.sh < "/workspace/input-$index.txt" > "$stdout_file" 2> "$stderr_file"
  run_exit="$?"
  emit_result test "$index" "$run_exit" "$stdout_file" "$stderr_file"
  rm -f "$stdout_file" "$stderr_file"
  if [ "$run_exit" -ne 0 ]; then
    exit 0
  fi
done
`;
}

export class HarnessProtocolParser {
  private buffer = Buffer.alloc(0);
  private pending:
    | {
        kind: "build_result";
        exitCode: number;
        stdoutLength: number;
        stderrLength: number;
        stdout?: Buffer;
      }
    | {
        kind: "test_result";
        index: number;
        exitCode: number;
        stdoutLength: number;
        stderrLength: number;
        stdout?: Buffer;
      }
    | null = null;

  push(chunk: Buffer) {
    const events: HarnessEvent[] = [];
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      if (this.pending) {
        const pending = this.pending;
        if (!pending.stdout) {
          if (this.buffer.length < pending.stdoutLength) {
            break;
          }
          pending.stdout = this.buffer.subarray(0, pending.stdoutLength);
          this.buffer = this.buffer.subarray(pending.stdoutLength);
        }

        if (this.buffer.length < pending.stderrLength) {
          break;
        }

        const stderr = this.buffer.subarray(0, pending.stderrLength);
        this.buffer = this.buffer.subarray(pending.stderrLength);
        this.pending = null;

        if (pending.kind === "build_result") {
          events.push({
            kind: "build_result",
            exitCode: pending.exitCode,
            stdout: pending.stdout.toString("utf8"),
            stderr: stderr.toString("utf8"),
          });
        } else {
          events.push({
            kind: "test_result",
            index: pending.index,
            exitCode: pending.exitCode,
            stdout: pending.stdout.toString("utf8"),
            stderr: stderr.toString("utf8"),
          });
        }
        continue;
      }

      const newlineIndex = this.buffer.indexOf(10);
      if (newlineIndex === -1) {
        break;
      }

      const line = this.buffer.subarray(0, newlineIndex).toString("utf8");
      this.buffer = this.buffer.subarray(newlineIndex + 1);
      const parts = line.split(" ");

      if (parts[0] !== HARNESS_PREFIX) {
        continue;
      }

      if (parts[1] === "BUILD_START") {
        events.push({ kind: "build_start" });
        continue;
      }

      if (parts[1] === "TEST_START") {
        const index = Number(parts[2]);
        if (Number.isInteger(index)) {
          events.push({ kind: "test_start", index });
        }
        continue;
      }

      if (parts[1] === "BUILD_RESULT") {
        const exitCode = Number(parts[2]);
        const stdoutLength = Number(parts[3]);
        const stderrLength = Number(parts[4]);
        if ([exitCode, stdoutLength, stderrLength].every(Number.isInteger)) {
          this.pending = { kind: "build_result", exitCode, stdoutLength, stderrLength };
        }
        continue;
      }

      if (parts[1] === "TEST_RESULT") {
        const index = Number(parts[2]);
        const exitCode = Number(parts[3]);
        const stdoutLength = Number(parts[4]);
        const stderrLength = Number(parts[5]);
        if ([index, exitCode, stdoutLength, stderrLength].every(Number.isInteger)) {
          this.pending = { kind: "test_result", index, exitCode, stdoutLength, stderrLength };
        }
      }
    }

    return events;
  }
}

function blockedRunResult(stderr: string): CodeRunResult {
  return {
    stdout: "",
    stderr,
    exitCode: 1,
    runtimeMs: 0,
    timedOut: false,
    oomKilled: false,
  };
}

function resolveRuntimeConfig(input: Pick<RunCodeInput, "fileExtension" | "buildCommand" | "runCommand" | "dockerImage">): RuntimeConfig {
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

  const fileName = `main.${extension}`;
  const buildCommand = input.buildCommand?.trim() || null;

  return {
    fileName,
    dockerImage,
    resolvedBuildCommand: buildCommand ? resolveRunCommand(buildCommand, fileName) : null,
    resolvedRunCommand: resolveRunCommand(runCommand, fileName),
  };
}

async function createWorkspace(fileName: string, sourceCode: string) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-grader-"));
  const scriptPath = path.join(workspace, fileName);
  await fs.writeFile(scriptPath, sourceCode, "utf8");
  await makeWorkspaceReadable(workspace, scriptPath);
  return workspace;
}

async function createBatchWorkspace(config: RuntimeConfig, sourceCode: string, testcases: Array<{ stdin: string }>) {
  const workspace = await createWorkspace(config.fileName, sourceCode);
  const files = [
    ["run.sh", createCommandScript(config.resolvedRunCommand)],
    ["grader-harness.sh", createHarnessScript()],
  ] as const;

  if (config.resolvedBuildCommand) {
    await fs.writeFile(path.join(workspace, "build.sh"), createCommandScript(config.resolvedBuildCommand), "utf8");
    await fs.chmod(path.join(workspace, "build.sh"), 0o644);
  }

  for (const [fileName, contents] of files) {
    const filePath = path.join(workspace, fileName);
    await fs.writeFile(filePath, contents, "utf8");
    await fs.chmod(filePath, 0o644);
  }

  for (const [index, testcase] of testcases.entries()) {
    await fs.writeFile(path.join(workspace, `input-${index}.txt`), testcase.stdin, "utf8");
  }

  return workspace;
}

async function removeContainer(containerName: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const processRef = spawn("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    const exitCode = await new Promise<number | null>((resolve) => {
      processRef.on("error", () => resolve(null));
      processRef.on("close", (code) => resolve(code));
    });

    if (exitCode === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function createFailedRunResult({
  stderr,
  stdout = "",
  exitCode = 1,
  runtimeMs = 0,
  timedOut = false,
  oomKilled = false,
}: Partial<CodeRunResult> & { stderr: string }): CodeRunResult {
  return {
    stdout,
    stderr,
    exitCode,
    runtimeMs,
    timedOut,
    oomKilled,
  };
}

type HarnessChunkResult = {
  results: Array<{
    index: number;
    result: CodeRunResult;
  }>;
  nextIndex: number;
};

async function runHarnessChunk({
  workspace,
  dockerImage,
  memoryLimitMb,
  timeLimitMs,
  startIndex,
  totalCount,
}: {
  workspace: string;
  dockerImage: string;
  memoryLimitMb?: number | null;
  timeLimitMs: number;
  startIndex: number;
  totalCount: number;
}): Promise<HarnessChunkResult> {
  const memoryLimit = `${memoryLimitMb ?? 128}m`;
  const containerName = path.basename(workspace);
  const testcaseIndexes = Array.from({ length: totalCount - startIndex }, (_, offset) => String(startIndex + offset));
  const parser = new HarnessProtocolParser();
  const testStartTimes = new Map<number, number>();
  const results: Array<{ index: number; result: CodeRunResult }> = [];
  let currentTestIndex: number | null = null;
  let currentTimer: ReturnType<typeof setTimeout> | null = null;
  let timedOutIndex: number | null = null;
  let buildTimedOut = false;
  let startupTimedOut = false;
  let stderr = "";

  const processRef = spawn(
    "docker",
    buildDockerBatchRunArgs({
      workspace,
      memoryLimit,
      dockerImage,
      containerName,
      command: "/bin/sh",
      args: ["/workspace/grader-harness.sh", ...testcaseIndexes],
    }),
    { stdio: "pipe" },
  );

  const clearCurrentTimer = () => {
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
    }
  };

  const killContainer = () => {
    processRef.kill("SIGKILL");
  };

  const clearStartupTimer = () => {
    if (startupTimer) {
      clearTimeout(startupTimer);
      startupTimer = null;
    }
  };

  const clearBuildTimer = () => {
    if (buildTimer) {
      clearTimeout(buildTimer);
      buildTimer = null;
    }
  };

  const startTimer = (index: number) => {
    clearCurrentTimer();
    currentTestIndex = index;
    testStartTimes.set(index, Date.now());
    currentTimer = setTimeout(() => {
      timedOutIndex = index;
      killContainer();
    }, timeLimitMs);
  };

  let startupTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    startupTimedOut = true;
    killContainer();
  }, DOCKER_START_TIMEOUT_MS);
  let buildTimer: ReturnType<typeof setTimeout> | null = null;

  processRef.stdout?.on("data", (chunk) => {
    for (const event of parser.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))) {
      if (event.kind === "build_start") {
        clearStartupTimer();
        clearBuildTimer();
        buildTimer = setTimeout(() => {
          buildTimedOut = true;
          killContainer();
        }, BUILD_TIMEOUT_MS);
        continue;
      }

      if (event.kind === "build_result") {
        clearStartupTimer();
        clearBuildTimer();
        if (event.exitCode !== 0) {
          for (let index = startIndex; index < totalCount; index += 1) {
            results.push({
              index,
              result: createFailedRunResult({
                stdout: event.stdout,
                stderr: event.stderr || "Build command failed.",
                exitCode: event.exitCode,
              }),
            });
          }
        }
        continue;
      }

      if (event.kind === "test_start") {
        clearStartupTimer();
        clearBuildTimer();
        startTimer(event.index);
        continue;
      }

      clearCurrentTimer();
      currentTestIndex = null;
      const startedAt = testStartTimes.get(event.index);
      results.push({
        index: event.index,
        result: {
          stdout: event.stdout,
          stderr: event.stderr,
          exitCode: event.exitCode,
          runtimeMs: startedAt ? Date.now() - startedAt : 0,
          timedOut: false,
          oomKilled: event.exitCode === 137,
        },
      });
    }
  });

  processRef.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
    if (Buffer.byteLength(stderr, "utf8") > MAX_GRADER_OUTPUT_BYTES) {
      stderr = stderr.slice(0, MAX_GRADER_OUTPUT_BYTES);
    }
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    processRef.on("error", () => resolve(null));
    processRef.on("close", (code) => resolve(code));
  });

  clearCurrentTimer();
  clearStartupTimer();
  clearBuildTimer();
  await removeContainer(containerName);

  if (startupTimedOut) {
    return {
      results: Array.from({ length: totalCount - startIndex }, (_, offset) => ({
        index: startIndex + offset,
        result: createFailedRunResult({
          stderr: "Grading container did not start.",
          exitCode: null,
          timedOut: true,
          runtimeMs: DOCKER_START_TIMEOUT_MS,
        }),
      })),
      nextIndex: totalCount,
    };
  }

  if (buildTimedOut) {
    return {
      results: Array.from({ length: totalCount - startIndex }, (_, offset) => ({
        index: startIndex + offset,
        result: createFailedRunResult({
          stderr: "Build command timed out.",
          exitCode: null,
          timedOut: true,
          runtimeMs: BUILD_TIMEOUT_MS,
        }),
      })),
      nextIndex: totalCount,
    };
  }

  if (timedOutIndex !== null) {
    results.push({
      index: timedOutIndex,
      result: createFailedRunResult({
        stderr: "Time limit exceeded.",
        exitCode: null,
        timedOut: true,
        runtimeMs: timeLimitMs,
      }),
    });

    return {
      results,
      nextIndex: timedOutIndex + 1,
    };
  }

  if (exitCode === 137 && currentTestIndex !== null) {
    results.push({
      index: currentTestIndex,
      result: createFailedRunResult({
        stderr: "Memory limit exceeded.",
        exitCode,
        oomKilled: true,
      }),
    });

    return {
      results,
      nextIndex: currentTestIndex + 1,
    };
  }

  const completedIndexes = new Set(results.map((item) => item.index));
  const nextMissingIndex = Array.from({ length: totalCount - startIndex }, (_, offset) => startIndex + offset)
    .find((index) => !completedIndexes.has(index));

  if (nextMissingIndex !== undefined) {
    results.push({
      index: nextMissingIndex,
      result: createFailedRunResult({
        stderr: stderr || "Grading container stopped before returning a result.",
        exitCode,
        oomKilled: exitCode === 137,
      }),
    });

    return {
      results,
      nextIndex: nextMissingIndex + 1,
    };
  }

  return {
    results,
    nextIndex: totalCount,
  };
}

export async function runCode(input: RunCodeInput) {
  const policyError = validateSourcePolicy(input);
  if (policyError) {
    return blockedRunResult(policyError);
  }

  const config = resolveRuntimeConfig(input);
  const workspace = await createWorkspace(config.fileName, input.sourceCode);

  try {
    const runtime = await resolveRuntime();
    if (runtime !== "docker") {
      throw new AppError(Messages.gradingMisconfigured, 500, ErrorCode.INTERNAL);
    }

    return await runWithDocker(
      workspace,
      input.stdin,
      input.timeLimitMs,
      input.memoryLimitMb,
      config.dockerImage,
      "/bin/sh",
      ["-c", config.resolvedRunCommand],
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

export async function runCodeBatch(input: RunCodeBatchInput) {
  if (input.testcases.length === 0) {
    return [];
  }

  const policyError = validateSourcePolicy(input);
  if (policyError) {
    return input.testcases.map(() => blockedRunResult(policyError));
  }

  const config = resolveRuntimeConfig(input);
  const workspace = await createBatchWorkspace(config, input.sourceCode, input.testcases);

  try {
    const runtime = await resolveRuntime();
    if (runtime !== "docker") {
      throw new AppError(Messages.gradingMisconfigured, 500, ErrorCode.INTERNAL);
    }

    const results = new Map<number, CodeRunResult>();
    let nextIndex = 0;

    while (nextIndex < input.testcases.length) {
      const chunk = await runHarnessChunk({
        workspace,
        dockerImage: config.dockerImage,
        memoryLimitMb: input.memoryLimitMb,
        timeLimitMs: input.timeLimitMs,
        startIndex: nextIndex,
        totalCount: input.testcases.length,
      });

      for (const item of chunk.results) {
        results.set(item.index, item.result);
      }

      if (chunk.nextIndex <= nextIndex) {
        break;
      }
      nextIndex = chunk.nextIndex;
    }

    return input.testcases.map((_, index) =>
      results.get(index) ??
      createFailedRunResult({
        stderr: "Grading container stopped before returning a result.",
      }),
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
