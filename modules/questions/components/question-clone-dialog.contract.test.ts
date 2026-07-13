import { describe, expect, test } from "bun:test";

describe("QuestionCloneDialog", () => {
  test("stops portaled dialog clicks before the question row can handle them", async () => {
    const source = await Bun.file(new URL("./question-clone-dialog.tsx", import.meta.url)).text();

    expect(source).toContain('className="contents" onClick={(event) => event.stopPropagation()}');
  });
});
