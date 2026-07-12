import { describe, expect, test } from "bun:test";

import { deriveRejudgeParentStatus, selectEffectiveQuestionScore } from "./effective-score";

describe("selectEffectiveQuestionScore", () => {
  test("counts ranked submissions rather than immutable runs", () => {
    const result = selectEffectiveQuestionScore([
      { submissionId: "s1", ranked: true, score: 80, createdAt: new Date("2026-01-01") },
      { submissionId: "s2", ranked: true, score: 60, createdAt: new Date("2026-01-02") },
      { submissionId: "staff", ranked: false, score: 100, createdAt: new Date("2026-01-03") },
    ]);
    expect(result).toEqual({ attempts: 2, bestScore: 80, bestSubmissionId: "s1" });
  });

  test("uses each submission's current effective score so a rejudge can lower the best", () => {
    const result = selectEffectiveQuestionScore([
      { submissionId: "formerly-best", ranked: true, score: 20, createdAt: new Date("2026-01-01") },
      { submissionId: "new-best", ranked: true, score: 60, createdAt: new Date("2026-01-02") },
    ]);
    expect(result?.bestSubmissionId).toBe("new-best");
    expect(result?.bestScore).toBe(60);
  });

  test("counts ranked infrastructure-only submissions without replacing the effective score", () => {
    const result = selectEffectiveQuestionScore([
      { submissionId: "scored", ranked: true, score: 75, createdAt: new Date("2026-01-01") },
      { submissionId: "infrastructure-only", ranked: true, score: null, createdAt: new Date("2026-01-02") },
    ]);
    expect(result).toEqual({ attempts: 2, bestScore: 75, bestSubmissionId: "scored" });
  });
});

describe("deriveRejudgeParentStatus", () => {
  test("waits for all children then reflects infrastructure failures", () => {
    expect(deriveRejudgeParentStatus(3, 1, 1)).toBe("running");
    expect(deriveRejudgeParentStatus(3, 3, 1)).toBe("failed");
    expect(deriveRejudgeParentStatus(3, 3, 0)).toBe("completed");
    expect(deriveRejudgeParentStatus(0, 0, 0)).toBe("completed");
  });
});
