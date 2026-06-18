import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";

const DOCKER_IMAGE_PATTERN =
  /^[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*)*(?::[A-Za-z0-9_.-]+)?(?:@[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Fa-f0-9]{32,})?$/;
const MAX_SCRIPT_OUTPUT_CHARS = 4000;
const PREPARE_IMAGE_TIMEOUT_MS = 10 * 60 * 1000;

function validateDockerImage(image: string) {
  if (!DOCKER_IMAGE_PATTERN.test(image)) {
    throw new Error("Docker image must be a valid image reference, such as python:3.12-alpine or gcc:13.");
  }
}

function trimOutput(value: string) {
  return value.length > MAX_SCRIPT_OUTPUT_CHARS
    ? `${value.slice(0, MAX_SCRIPT_OUTPUT_CHARS)}\n...`
    : value;
}

export async function prepareDockerImage(image: string) {
  const dockerImage = image.trim();
  validateDockerImage(dockerImage);

  const scriptPath =
    process.platform === "win32"
      ? path.join(process.cwd(), "scripts", "prepare-docker-image.ps1")
      : path.join(process.cwd(), "scripts", "prepare-docker-image.sh");

  const command =
    process.platform === "win32"
      ? "powershell.exe"
      : "sh";

  const args =
    process.platform === "win32"
      ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Image", dockerImage]
      : [scriptPath, dockerImage];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: "pipe",
  });

  return await new Promise<{ image: string; output: string }>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      callback();
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => {
        reject(new Error(`Timed out while preparing Docker image '${dockerImage}'.`));
      });
    }, PREPARE_IMAGE_TIMEOUT_MS);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish(() => {
        reject(new Error(`Unable to start Docker image preparation script: ${error.message}`));
      });
    });

    child.on("close", (code) => {
      finish(() => {
        const output = trimOutput([stdout.trim(), stderr.trim()].filter(Boolean).join("\n"));

        if (code === 0) {
          resolve({ image: dockerImage, output });
          return;
        }

        reject(new Error(output || `Unable to prepare Docker image '${dockerImage}'.`));
      });
    });
  });
}
