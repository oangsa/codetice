import { compareOutput } from "@/lib/grader/compare-output";
import { runCodeBatch } from "@/lib/grader/run-code";

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
    testcases: input.testcases.map((testcase) => ({
      stdin: testcase.input,
    })),
  });

  return input.testcases.map((testcase, index) => {
    const run = runs[index];
    const passed =
      !run.timedOut &&
      !run.oomKilled &&
      run.exitCode === 0 &&
      compareOutput(run.stdout, testcase.expectedOutput, testcase.checkerType, testcase.floatTolerance);

    const status = run.oomKilled
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
      actualOutput: run.stdout,
      expectedOutput: testcase.expectedOutput,
      errorMessage: run.stderr || null,
      isHidden: testcase.isHidden,
    };
  });
}
