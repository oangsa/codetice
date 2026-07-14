import { buildDockerRunArgs } from "@/server/grading/run-code";

export function buildCompilerDiagnosticsDockerArgs(input: {
  workspace: string;
  dockerImage: string;
  containerName: string;
  diagnosticsCommand: string;
}) {
  return buildDockerRunArgs({
    workspace: input.workspace,
    memoryLimit: "256m",
    dockerImage: input.dockerImage,
    containerName: input.containerName,
    command: "/bin/sh",
    args: ["-lc", input.diagnosticsCommand],
  });
}
