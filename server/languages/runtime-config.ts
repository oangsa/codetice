import { AppError, ErrorCode, Messages } from "@/lib/errors";

export function validateRuntimeCommands(input: {
  buildCommand?: string | null;
  runCommand: string;
}) {
  let buildCommand = input.buildCommand?.trim() || null;
  let runCommand = input.runCommand.trim();
  const invalidLine = (command: string) => /[\r\n\0]/.test(command);
  const referencesTmp = (command: string) => /\/tmp(?:\/|(?=\s|$))/.test(command);
  const referencesWorkspaceSource = (command: string) => (
    /(?:^|\s)["']?\/workspace\/[A-Za-z0-9][A-Za-z0-9._+-]{0,127}["']?(?=\s|$)/.test(command)
  );

  if (!buildCommand) {
    const legacyCompiled = runCommand.match(
      /^((?:gcc|g\+\+|clang|clang\+\+|rustc)\s+.+?)\s+-o\s+\/(?:workspace|tmp)\/([A-Za-z0-9][A-Za-z0-9._+-]{0,127})\s*&&\s*\/(?:workspace|tmp)\/\2\s*$/,
    );
    if (legacyCompiled?.[1] && legacyCompiled[2]) {
      buildCommand = `${legacyCompiled[1]} -o /tmp/${legacyCompiled[2]}`;
      runCommand = `/tmp/${legacyCompiled[2]}`;
    }
  }

  if (!runCommand) {
    throw new AppError(Messages.langMissingRunCommand, 400, ErrorCode.VALIDATION);
  }
  if (buildCommand && (
    invalidLine(buildCommand)
    || !buildCommand.includes("{file}")
    || !referencesTmp(buildCommand)
  )) {
    throw new AppError(Messages.langInvalidBuildCommand, 400, ErrorCode.VALIDATION);
  }
  if (
    invalidLine(runCommand)
    || (
      !runCommand.includes("{file}")
      && !referencesWorkspaceSource(runCommand)
      && !(buildCommand && referencesTmp(runCommand))
    )
  ) {
    throw new AppError(Messages.langInvalidRunCommand, 400, ErrorCode.VALIDATION);
  }

  return { buildCommand, runCommand };
}
