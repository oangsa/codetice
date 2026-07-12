import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";

import { workspaces } from "@/db/schema";
import { workspaceListStatistics } from "@/server/workspaces/list-statistics";

describe("workspace list SQL", () => {
  test("qualifies outer workspace columns inside correlated statistics", () => {
    const db = drizzle.mock();
    const statistics = workspaceListStatistics("fa779a93-8f44-4640-a629-cdcc3188198f");
    const query = db.select({
      id: workspaces.id,
      ...statistics,
    }).from(workspaces).toSQL().sql;

    expect(query).toContain('cm_count.workspace_id = "workspaces"."id"');
    expect(query).toContain('creator.id = "workspaces"."created_by"');
    expect(query).toContain('solved_question.workspace_id = "workspaces"."id"');
    expect(query).not.toContain('workspace_id = "id"');
    expect(query).not.toContain('creator.id = "created_by"');
    expect(query).not.toContain('"workspaces"."workspaces"');
  });

  test("counts personal solves from immutable scored runs, including unranked staff submissions", () => {
    const db = drizzle.mock();
    const statistics = workspaceListStatistics("fa779a93-8f44-4640-a629-cdcc3188198f");
    const query = db.select({
      id: workspaces.id,
      ...statistics,
    }).from(workspaces).toSQL().sql;

    expect(query).toContain('from "submissions" personal_submission');
    expect(query).toContain("personal_submission.latest_scored_run_id");
    expect(query).toContain("personal_submission.question_id = solved_question.id");
    expect(query).not.toContain('from "question_scores" score_count');
    expect(query).not.toContain("personal_submission.is_ranked");
  });
});
