export function calculateScore(totalScore: number, passedCount: number, totalCount: number) {
  if (totalCount <= 0) {
    return 0;
  }

  const pointsPerTestcase = totalScore / totalCount;
  return Number((pointsPerTestcase * passedCount).toFixed(2));
}
