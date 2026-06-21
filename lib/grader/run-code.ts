import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

import { MAX_GRADER_OUTPUT_BYTES } from "@/lib/constants";

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

const PYTHON_BLOCKED_MODULES = [
  "os",
  "platform",
  "subprocess",
  "socket",
  "importlib",
  "ctypes",
  "pathlib",
  "shutil",
  "glob",
  "resource",
  "multiprocessing",
];

const PYTHON_BLOCKED_SYS_ATTRIBUTES = [
  "argv",
  "base_prefix",
  "builtin_module_names",
  "byteorder",
  "copyright",
  "dont_write_bytecode",
  "executable",
  "flags",
  "implementation",
  "modules",
  "path",
  "platform",
  "prefix",
  "version",
  "version_info",
];

let dockerAvailability: boolean | null = null;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validatePythonSourcePolicy(sourceCode: string) {
  for (const moduleName of PYTHON_BLOCKED_MODULES) {
    const modulePattern = escapeRegExp(moduleName);
    const importPattern = new RegExp(
      `(^|\\n)\\s*(?:from\\s+${modulePattern}(?:\\s|\\.|$)|import\\s+(?:[^\\n#]*,\\s*)?${modulePattern}(?:\\s+as\\s+\\w+)?(?:\\s*,|\\s|#|$))`,
      "m",
    );
    const dynamicImportPattern = new RegExp(
      `(?:__import__\\s*\\(|import_module\\s*\\()\\s*["']${modulePattern}(?:\\.|["'])`,
    );

    if (importPattern.test(sourceCode) || dynamicImportPattern.test(sourceCode)) {
      return `Blocked import '${moduleName}'. System and introspection modules are not allowed.`;
    }
  }

  for (const attribute of PYTHON_BLOCKED_SYS_ATTRIBUTES) {
    const attributePattern = new RegExp(`\\bsys\\s*\\.\\s*${escapeRegExp(attribute)}\\b`);
    if (attributePattern.test(sourceCode)) {
      return `Blocked access 'sys.${attribute}'. System introspection is not allowed.`;
    }
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
    throw new Error(`File extension not specified for language '${input.language}'.`);
  }

  const dockerImage = input.dockerImage?.trim();
  if (!dockerImage) {
    throw new Error(`Docker image not specified for language '${input.language}'.`);
  }

  const runCommand = input.runCommand?.trim();
  if (!runCommand) {
    throw new Error(`Run command not specified for language '${input.language}'.`);
  }

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-grader-"));
  const fileName = `main.${extension}`;
  const scriptPath = path.join(workspace, fileName);
  await fs.writeFile(scriptPath, input.sourceCode, "utf8");
  await makeWorkspaceReadable(workspace, scriptPath);

  try {
    const runtime = await resolveRuntime();
    if (runtime !== "docker") {
      throw new Error("Unsupported grading runtime.");
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
