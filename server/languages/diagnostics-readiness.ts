export type DiagnosticsFormat = "none" | "pyright" | "compiler";

export function requiresPreparedRuntimeForDiagnostics(format: DiagnosticsFormat) {
  return format === "compiler";
}
