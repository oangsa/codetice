import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";

import { questions } from "@/db/schema";
import { personalQuestionProgress } from "@/server/questions/personal-progress";

describe("personal question progress SQL", () => {
  test("counts attempts independently from ranked scores and uses each submission's effective run", () => {
    const db = drizzle.mock();
    const progress = personalQuestionProgress("fa779a93-8f44-4640-a629-cdcc3188198f");
    const query = db.select({
      id: questions.id,
      ...progress,
    }).from(questions).toSQL().sql;

    expect(query).toContain('from "submissions" personal_submission');
    expect(query).toContain("personal_submission.user_id");
    expect(query).toContain('personal_submission.question_id = "questions"."id"');
    expect(query).toContain("personal_submission.latest_scored_run_id");
    expect(query).not.toContain("personal_submission.is_ranked");
    expect(query).not.toContain("question_scores");
  });
});
