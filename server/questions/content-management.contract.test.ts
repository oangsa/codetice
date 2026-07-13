import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("workspace content management contract", () => {
  test("uses workspace-scoped, all-or-nothing bulk publication with testcase skips", async () => {
    const source = await readFile(new URL("./mutations.ts", import.meta.url), "utf8");

    expect(source).toContain("setWorkspaceQuestionPublication");
    expect(source).toContain("selectedQuestions.length !== input.questionIds.length");
    expect(source).toContain("skippedQuestionIds");
    expect(source).toContain("inArray(questions.id, input.questionIds)");
    expect(source).toContain("count(*)::int");
  });

  test("clones only question content and protects both source and target workspace boundaries", async () => {
    const source = await readFile(new URL("./cloning.ts", import.meta.url), "utf8");

    expect(source).toContain("requireWorkspaceStaff(input.actor, input.workspaceId)");
    expect(source).toContain("requireWorkspaceStaff(input.actor, input.targetWorkspaceId)");
    expect(source).toContain("requireWorkspaceAdmin(input.actor, input.workspaceId)");
    expect(source).toContain("mapTagsForQuestionClone");
    expect(source).toContain("input.tx.insert(testcases)");
    expect(source).toContain("input.tx.insert(customCheckers)");
    expect(source).toContain("createdBy: input.actorId");
    expect(source).not.toContain("submissionRuns");
    expect(source).not.toContain("gradingJobs");
    expect(source).not.toContain("rejudgeJobs");
  });
});
