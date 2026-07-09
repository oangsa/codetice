import { describe, expect, test } from "bun:test";

import { buildClassroomQuestionRows, type ClassroomQuestionSourceRow } from "@/lib/classroom-question-rows";

function createQuestionRow(input: Partial<ClassroomQuestionSourceRow> & Pick<ClassroomQuestionSourceRow, "questionId" | "title" | "isPublished">): ClassroomQuestionSourceRow {
  return {
    assignmentId: "assignment-1",
    assignmentTitle: "General",
    dueAt: null,
    slug: input.title.toLowerCase().replaceAll(" ", "-"),
    difficulty: "easy",
    totalScore: "100",
    ...input,
  };
}

describe("buildClassroomQuestionRows", () => {
  test("excludes hidden questions and numbers only visible rows by default", () => {
    const rows = [
      createQuestionRow({ questionId: "visible-1", title: "Visible 1", isPublished: true }),
      createQuestionRow({ questionId: "hidden-1", title: "Hidden 1", isPublished: false }),
      createQuestionRow({ questionId: "visible-2", title: "Visible 2", isPublished: true }),
    ];

    const result = buildClassroomQuestionRows(rows, []);

    expect(result.map((row) => row.questionId)).toEqual(["visible-1", "visible-2"]);
    expect(result.map((row) => row.rowNumber)).toEqual([1, 2]);
  });

  test("includes hidden questions when explicitly requested", () => {
    const rows = [
      createQuestionRow({ questionId: "visible-1", title: "Visible 1", isPublished: true }),
      createQuestionRow({ questionId: "hidden-1", title: "Hidden 1", isPublished: false }),
    ];

    const result = buildClassroomQuestionRows(rows, [], { includeHidden: true });

    expect(result.map((row) => row.questionId)).toEqual(["visible-1", "hidden-1"]);
    expect(result.map((row) => row.rowNumber)).toEqual([1, 2]);
  });
});
