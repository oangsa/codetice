import "server-only";

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { MAX_GRADER_OUTPUT_BYTES } from "@/lib/grader.constants";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { getPyrightDiagnostics, type PyrightDiagnostic } from "@/lib/grader/pyright";

export type LanguageDiagnostic = PyrightDiagnostic;

type DiagnosticsFormat = "none" | "pyright" | "compiler";

type CompilerDiagnosticsInput = {
  dockerImage: string;
  fileExtension: string;
  diagnosticsCommand: string;
  sourceCode: string;
};

let dockerAvailability: boolean | null = null;

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
  await fs.writeFile(scriptPath, sourceCode, "utf8");

  try {
    const resolvedCommand = diagnosticsCommand.replaceAll("{file}", `/workspace/${fileName}`);
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--memory",
        "256m",
        "--cpus",
        "1",
        "--pids-limit",
        "64",
        "--read-only",
        "-v",
        `${workspace}:/workspace`,
        "-w",
        "/workspace",
        dockerImage,
        "/bin/sh",
        "-c",
        resolvedCommand,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const output = await new Promise<string>((resolve) => {
      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", () => {
        const combined = `${stdout}\n${stderr}`.trim();
        resolve(combined.slice(0, MAX_GRADER_OUTPUT_BYTES));
      });

      child.on("error", (error) => {
        resolve(String(error.message || "Unable to start diagnostics command."));
      });
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
