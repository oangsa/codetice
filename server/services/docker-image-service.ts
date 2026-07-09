import "server-only";

import { spawn } from "node:child_process";

import {
  buildDockerImageInspectArgs,
  buildDockerPullArgs,
  validateDockerImage,
} from "@/lib/docker-image";

const MAX_DOCKER_OUTPUT_CHARS = 4000;
const PREPARE_IMAGE_TIMEOUT_MS = 10 * 60 * 1000;

function trimOutput(value: string) {
  return value.length > MAX_DOCKER_OUTPUT_CHARS
    ? `${value.slice(0, MAX_DOCKER_OUTPUT_CHARS)}\n...`
    : value;
}

async function runDockerCommand(args: string[], timeoutMs = PREPARE_IMAGE_TIMEOUT_MS) {
  const child = spawn("docker", args, {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: "pipe",
  });

  return await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
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
        reject(new Error(`Timed out while running docker ${args.join(" ")}.`));
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish(() => {
        reject(new Error(`Unable to start Docker CLI: ${error.message}`));
      });
    });

    child.on("close", (code) => {
      finish(() => {
        const output = trimOutput([stdout.trim(), stderr.trim()].filter(Boolean).join("\n"));
        resolve({ code, output });
      });
    });
  });
}

export async function prepareDockerImage(image: string) {
  const dockerImage = image.trim();
  validateDockerImage(dockerImage);

  const inspect = await runDockerCommand(buildDockerImageInspectArgs(dockerImage));
  if (inspect.code === 0) {
    return {
      image: dockerImage,
      output: inspect.output || `Docker image '${dockerImage}' is already available.`,
      pulled: false,
    };
  }

  const pull = await runDockerCommand(buildDockerPullArgs(dockerImage));
  if (pull.code !== 0) {
    throw new Error(pull.output || `Unable to pull Docker image '${dockerImage}'.`);
  }

  const verify = await runDockerCommand(buildDockerImageInspectArgs(dockerImage));
  if (verify.code !== 0) {
    throw new Error(verify.output || `Docker image '${dockerImage}' was pulled but cannot be inspected.`);
  }

  return {
    image: dockerImage,
    output: [pull.output, verify.output].filter(Boolean).join("\n"),
    pulled: true,
  };
}
