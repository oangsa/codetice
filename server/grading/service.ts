import { compareOutput } from "@/server/grading/compare-output";
import { runCodeBatch } from "@/server/grading/run-code";

type GradeInput = {
  language: string;
  fileExtension?: string | null;
  buildCommand?: string | null;
  runCommand?: string | null;
  dockerImage?: string | null;
  sourceCode: string;
  testcases: Array<{
    id: string;
    name: string | null;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    checkerType: string;
    floatTolerance: string | null;
  }>;
  timeLimitMs: number;
  memoryLimitMb?: number | null;
  signal?: AbortSignal;
};

export async function gradeCode(input: GradeInput) {
  const runs = await runCodeBatch({
    language: input.language,
    sourceCode: input.sourceCode,
    timeLimitMs: input.timeLimitMs,
    memoryLimitMb: input.memoryLimitMb,
    fileExtension: input.fileExtension,
    buildCommand: input.buildCommand,
    runCommand: input.runCommand,
    dockerImage: input.dockerImage,
    signal: input.signal,
    testcases: input.testcases.map((testcase) => ({
      stdin: testcase.input,
    })),
  });

  const results = input.testcases.map((testcase, index) => {
    const run = runs[index];
    if (!run) {
      return {
        testcaseId: testcase.id,
        name: testcase.name,
        status: "internal_error",
        passed: false,
        runtimeMs: null,
        memoryKb: null,
        actualOutput: null,
        expectedOutput: testcase.expectedOutput,
        errorMessage: "Runner did not return a result.",
        isHidden: testcase.isHidden,
        infrastructureFailure: true,
      };
    }
    const passed =
      run.failureKind === "none" &&
      !run.timedOut &&
      !run.oomKilled &&
      run.exitCode === 0 &&
      compareOutput(run.stdout, testcase.expectedOutput, testcase.checkerType, testcase.floatTolerance);

    const status = run.failureKind === "infrastructure_error"
      ? "internal_error"
      : run.failureKind === "compile_error"
        ? "compile_error"
        : run.oomKilled
      ? "memory_limit_exceeded"
      : run.timedOut
        ? "time_limit_exceeded"
        : run.exitCode !== 0
          ? "runtime_error"
          : passed
            ? "accepted"
            : "wrong_answer";

    return {
      testcaseId: testcase.id,
      name: testcase.name,
      status,
      passed,
      runtimeMs: run.runtimeMs,
      memoryKb: null,
      actualOutput: run.failureKind === "infrastructure_error" ? null : run.stdout,
      expectedOutput: testcase.expectedOutput,
      errorMessage: run.stderr || null,
      isHidden: testcase.isHidden,
      infrastructureFailure: run.failureKind === "infrastructure_error",
    };
  });

  return {
    results,
    infrastructureFailure: results.some((item) => item.infrastructureFailure),
    errorMessage: results.find((item) => item.errorMessage)?.errorMessage ?? null,
  };
}
