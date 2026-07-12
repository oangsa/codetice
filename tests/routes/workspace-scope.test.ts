import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function exists(path: string) {
  return existsSync(resolve(root, path));
}

describe("workspace-scoped route contract", () => {
  test("exposes the workspace resource hierarchy", () => {
    const required = [
      "app/api/workspaces/[id]/questions/route.ts",
      "app/api/workspaces/[id]/submissions/route.ts",
      "app/api/workspaces/[id]/diagnostics/route.ts",
      "app/api/workspaces/[id]/run-sample/route.ts",
      "app/api/workspaces/[id]/submit/route.ts",
      "app/workspaces/[id]/questions/[questionId]/page.tsx",
      "app/workspaces/[id]/submissions/page.tsx",
    ];

    for (const path of required) expect(exists(path), path).toBe(true);
  });

  test("hard-removes global resource pages and APIs", () => {
    const removed = [
      "app/questions/page.tsx",
      "app/questions/[slug]/page.tsx",
      "app/assignments/page.tsx",
      "app/submissions/page.tsx",
      "app/submissions/[id]/page.tsx",
      "app/leaderboard/page.tsx",
      "app/admin/questions/page.tsx",
      "app/admin/assignments/page.tsx",
      "app/api/questions/route.ts",
      "app/api/assignments/route.ts",
      "app/api/submissions/[id]/route.ts",
      "app/api/leaderboard/route.ts",
      "app/api/submit/route.ts",
      "app/api/run-sample/route.ts",
      "app/api/languages/diagnostics/route.ts",
      "app/api/admin/rejudge/submissions/[id]/route.ts",
      "app/api/admin/rejudge/questions/[id]/route.ts",
      "app/api/workspaces/[id]/leaderboard/route.ts",
      "app/workspaces/[id]/leaderboard/page.tsx",
    ];

    for (const path of removed) expect(exists(path), path).toBe(false);
  });

  test("hard-removes classroom pages and APIs", () => {
    const removed = [
      "app/classrooms/page.tsx",
      "app/classrooms/[id]/page.tsx",
      "app/api/classrooms/route.ts",
      "app/api/classrooms/[id]/route.ts",
      "app/api/classrooms/[id]/submit/route.ts",
      "app/workspaces/[id]/assignments/page.tsx",
      "app/api/workspaces/[id]/assignments/route.ts",
      "app/api/workspaces/[id]/assignments/[assignmentId]/route.ts",
    ];

    for (const path of removed) expect(exists(path), path).toBe(false);
  });

  test("uses one dynamic question segment for detail and edit routes", () => {
    const questionsDirectory = resolve(root, "app/workspaces/[id]/questions");
    const dynamicSegments = readdirSync(questionsDirectory)
      .filter((entry) => entry.startsWith("[") && entry.endsWith("]"))
      .filter((entry) => exists(`app/workspaces/[id]/questions/${entry}/page.tsx`));

    expect(dynamicSegments).toEqual(["[questionId]"]);
  });
});
