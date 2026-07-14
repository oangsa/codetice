export type EffectiveSubmissionScore = {
  submissionId: string;
  ranked: boolean;
  score: number | null;
  createdAt: Date;
};

export function selectEffectiveQuestionScore(rows: EffectiveSubmissionScore[]) {
  const ranked = rows.filter((row) => row.ranked);
  if (ranked.length === 0) {
    return null;
  }

  const scored = ranked.filter((row) => row.score !== null);
  if (scored.length === 0) {
    return { attempts: ranked.length, bestScore: 0, bestSubmissionId: null };
  }

  const sorted = [...scored].sort((left, right) => {
    const scoreDifference = (right.score ?? 0) - (left.score ?? 0);
    if (scoreDifference !== 0) return scoreDifference;
    const dateDifference = left.createdAt.getTime() - right.createdAt.getTime();
    if (dateDifference !== 0) return dateDifference;
    return left.submissionId.localeCompare(right.submissionId);
  });

  return {
    attempts: ranked.length,
    bestScore: sorted[0]!.score ?? 0,
    bestSubmissionId: sorted[0]!.submissionId,
  };
}

export function deriveRejudgeParentStatus(
  totalCount: number,
  completedCount: number,
  failedCount: number,
): "queued" | "running" | "completed" | "failed" {
  if (totalCount === 0) return "completed";
  if (completedCount < totalCount) return completedCount === 0 ? "queued" : "running";
  return failedCount > 0 ? "failed" : "completed";
}
