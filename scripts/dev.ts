import { spawn, type ChildProcess } from "node:child_process";

type DevProcess = {
  name: string;
  child: ChildProcess;
};

const bun = process.execPath;
const processes: DevProcess[] = [];
let shuttingDown = false;
let exitCode = 0;

function start(name: string, args: string[]) {
  const child = spawn(bun, args, {
    stdio: "inherit",
    env: process.env,
  });

  const processInfo = { name, child };
  processes.push(processInfo);

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    exitCode = 1;
    console.error(`${name} failed to start:`, error);
    shutdown();
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    exitCode = code ?? (signal ? 1 : 0);
    if (exitCode !== 0 || signal) {
      console.error(`${name} exited${signal ? ` from ${signal}` : ` with code ${exitCode}`}.`);
    }
    shutdown();
  });
}

function shutdown(signal: NodeJS.Signals = "SIGTERM") {
  shuttingDown = true;

  for (const { child } of processes) {
    if (!child.killed && child.exitCode === null) {
      child.kill(signal);
    }
  }

  setTimeout(() => {
    for (const { child } of processes) {
      if (!child.killed && child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }

    process.exit(exitCode);
  }, 1_000).unref();
}

process.on("SIGINT", () => {
  exitCode = 130;
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  exitCode = 143;
  shutdown("SIGTERM");
});

start("web", ["./node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0"]);
start("worker", ["--conditions", "react-server", "--env-file=.env.local", "scripts/process-grading-jobs.ts"]);
