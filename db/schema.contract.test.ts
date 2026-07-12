import { describe, expect, test } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  workspaceMembers,
  gradingJobs,
  questions,
  rejudgeJobs,
  submissionRuns,
  submissions,
  testcaseResults,
} from "./schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("workspace grading schema contract", () => {
  test("questions carry workspace ownership without assignment storage", async () => {
    expect(columnNames(questions)).toContain("workspace_id");
    expect(columnNames(submissions)).not.toContain("assignment_id");
    expect(columnNames(submissions)).not.toContain("is_late");
    const schemaSource = await Bun.file(new URL("./schema.ts", import.meta.url)).text();
    expect(schemaSource).not.toContain("export const assignments");
    expect(schemaSource).not.toContain("export const assignmentQuestions");
  });

  test("submissions keep permanent ranking and immutable run pointers", () => {
    expect(columnNames(submissions)).toEqual(
      expect.arrayContaining(["is_ranked", "latest_run_id", "latest_scored_run_id"]),
    );
    expect(columnNames(submissionRuns)).toEqual(
      expect.arrayContaining(["submission_id", "sequence", "trigger", "requested_by"]),
    );
  });

  test("result and job rows belong to immutable runs", () => {
    expect(columnNames(testcaseResults)).toContain("submission_run_id");
    expect(columnNames(gradingJobs)).toEqual(
      expect.arrayContaining(["submission_run_id", "rejudge_job_id"]),
    );
  });

  test("rejudge jobs and memberships use workspace-scoped vocabulary", () => {
    expect(columnNames(rejudgeJobs)).toEqual(
      expect.arrayContaining(["workspace_id", "submission_id", "total_count", "failed_count"]),
    );
    expect(workspaceMembers.role.default).toBe("student");
  });
});
