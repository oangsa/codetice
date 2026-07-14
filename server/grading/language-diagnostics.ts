import "server-only";

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { MAX_GRADER_OUTPUT_BYTES } from "@/server/grading/constants";
import { buildCompilerDiagnosticsDockerArgs } from "@/server/grading/compiler-diagnostics-docker";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getPyrightDiagnostics, type PyrightDiagnostic } from "@/server/grading/pyright";

export type LanguageDiagnostic = PyrightDiagnostic;

type DiagnosticsFormat = "none" | "pyright" | "compiler";

type CompilerDiagnosticsInput = {
  dockerImage: string;
  fileExtension: string;
  diagnosticsCommand: string;
  sourceCode: string;
};

let dockerAvailability: boolean | null = null;
const DIAGNOSTICS_TIMEOUT_MS = 10_000;

async function commandExists(command: string) {
  return await new Promise<boolean>((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });

    child.once("error", () => {
      resolve(false);
    });

    child.once("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function ensureDockerAvailable() {
  if (dockerAvailability === null) {
    dockerAvailability = await commandExists("docker");
  }

  if (!dockerAvailability) {
    throw new AppError(Messages.gradingUnavailable, 503, ErrorCode.UNAVAILABLE);
  }
}

function parseCompilerDiagnostics(output: string, fileName: string) {
  const diagnostics: LanguageDiagnostic[] = [];
  const normalizedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|\\/|\\\\)${normalizedFileName}:(\\d+):(\\d+):\\s*(fatal error|error|warning|note):\\s*(.+)$`,
    "i",
  );

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) {
      continue;
    }

    const [, lineNumber, columnNumber, severityLabel, message] = match;
    const severity =
      severityLabel.toLowerCase() === "warning"
        ? "warning"
        : severityLabel.toLowerCase() === "note"
          ? "information"
          : "error";

    diagnostics.push({
      message: message.trim(),
      line: Number(lineNumber),
      column: Number(columnNumber),
      endLine: Number(lineNumber),
      endColumn: Number(columnNumber) + 1,
      severity,
    });
  }

  if (diagnostics.length > 0) {
    return diagnostics;
  }

  const fallbackMessage = output.trim();
  return fallbackMessage
    ? [
        {
          message: fallbackMessage.split(/\r?\n/)[0],
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 2,
          severity: "error",
        },
      ]
    : [];
}

async function getCompilerDiagnostics({
  dockerImage,
  fileExtension,
  diagnosticsCommand,
  sourceCode,
}: CompilerDiagnosticsInput) {
  await ensureDockerAvailable();

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-diagnostics-"));
  const fileName = `main.${fileExtension}`;
  const scriptPath = path.join(workspace, fileName);
  await fs.writeFile(scriptPath, sourceCode, { encoding: "utf8", mode: 0o644 });
  await fs.chmod(workspace, 0o755);

  try {
    const resolvedCommand = diagnosticsCommand.replaceAll("{file}", `/workspace/${fileName}`);
    const containerName = `codetice-diagnostics-${crypto.randomUUID()}`;
    const child = spawn(
      "docker",
      buildCompilerDiagnosticsDockerArgs({
        workspace,
        dockerImage,
        containerName,
        diagnosticsCommand: resolvedCommand,
      }),
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const output = await new Promise<string>((resolve) => {
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let settled = false;

      const finish = (value: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      };

      const append = (target: Buffer[], chunk: Buffer, currentBytes: number) => {
        const remaining = Math.max(0, MAX_GRADER_OUTPUT_BYTES - currentBytes);
        if (remaining > 0) target.push(chunk.subarray(0, remaining));
        return currentBytes + chunk.length;
      };

      child.stdout?.on("data", (chunk) => {
        stdoutBytes = append(stdout, Buffer.from(chunk), stdoutBytes);
        if (stdoutBytes > MAX_GRADER_OUTPUT_BYTES) child.kill("SIGKILL");
      });

      child.stderr?.on("data", (chunk) => {
        stderrBytes = append(stderr, Buffer.from(chunk), stderrBytes);
        if (stderrBytes > MAX_GRADER_OUTPUT_BYTES) child.kill("SIGKILL");
      });

      child.on("close", () => {
        const combined = Buffer.concat([...stdout, Buffer.from("\n"), ...stderr])
          .subarray(0, MAX_GRADER_OUTPUT_BYTES)
          .toString("utf8")
          .trim();
        finish(combined);
      });

      child.on("error", (error) => {
        finish(String(error.message || "Unable to start diagnostics command."));
      });

      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        const cleanup = spawn("docker", ["rm", "-f", containerName], { stdio: "ignore" });
        cleanup.unref();
        finish("Diagnostics timed out.");
      }, DIAGNOSTICS_TIMEOUT_MS);
    });

    return parseCompilerDiagnostics(output, fileName);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

export async function getLanguageDiagnostics(input: {
  diagnosticsFormat: DiagnosticsFormat;
  diagnosticsCommand?: string | null;
  dockerImage: string;
  fileExtension: string;
  sourceCode: string;
}) {
  if (input.diagnosticsFormat === "none") {
    return [] satisfies LanguageDiagnostic[];
  }

  if (input.diagnosticsFormat === "pyright") {
    return await getPyrightDiagnostics(input.sourceCode);
  }

  if (!input.diagnosticsCommand) {
    return [] satisfies LanguageDiagnostic[];
  }

  return await getCompilerDiagnostics({
    dockerImage: input.dockerImage,
    fileExtension: input.fileExtension,
    diagnosticsCommand: input.diagnosticsCommand,
    sourceCode: input.sourceCode,
  });
}
