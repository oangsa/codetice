import "server-only";

import { compareOutput } from "@/lib/grader/compare-output";
import { runPythonCode } from "@/lib/grader/run-python";

type GradeInput = {
  sourceCode: string;
  testcases: Array<{
    id: string;
    name: string | null;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
  timeLimitMs: number;
};

export async function gradeCode(input: GradeInput) {
  const results = [];

  for (const testcase of input.testcases) {
    const run = await runPythonCode(input.sourceCode, testcase.input, input.timeLimitMs);
    const passed = !run.timedOut && run.exitCode === 0 && compareOutput(run.stdout, testcase.expectedOutput);

    const status = run.timedOut
      ? "time_limit_exceeded"
      : run.exitCode !== 0
        ? "runtime_error"
        : passed
          ? "accepted"
          : "wrong_answer";

    results.push({
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
    });
  }

  return results;
}
