export type ClassroomQuestionStatus = "todo" | "attempted" | "accepted";

export type ClassroomQuestionSourceRow = {
  assignmentId: string;
  assignmentTitle: string;
  dueAt: Date | null;
  questionId: string;
  title: string;
  slug: string;
  difficulty: string;
  totalScore: string;
  isPublished: boolean;
};

export type ClassroomQuestionScoreRow = {
  questionId: string;
  bestScore: string | null;
  attempts: number;
};

export type ClassroomQuestionRow = ClassroomQuestionSourceRow & {
  rowNumber: number;
  bestScore: string | null;
  attempts: number;
  status: ClassroomQuestionStatus;
};

export function buildClassroomQuestionRows(
  rows: ClassroomQuestionSourceRow[],
  scores: ClassroomQuestionScoreRow[],
  options: { includeHidden?: boolean } = {},
): ClassroomQuestionRow[] {
  const scoreByQuestionId = new Map(scores.map((score) => [score.questionId, score]));
  const seen = new Set<string>();
  const items: ClassroomQuestionRow[] = [];

  for (const row of rows) {
    if (!options.includeHidden && !row.isPublished) continue;
    if (seen.has(row.questionId)) continue;

    seen.add(row.questionId);

    const score = scoreByQuestionId.get(row.questionId) ?? null;
    const bestScore = score?.bestScore ?? null;
    const attempts = score?.attempts ?? 0;
    const totalScore = parseFloat(row.totalScore);
    const best = bestScore ? parseFloat(bestScore) : 0;
    const status: ClassroomQuestionStatus =
      attempts === 0 ? "todo" : best >= totalScore ? "accepted" : "attempted";

    items.push({
      ...row,
      rowNumber: items.length + 1,
      bestScore,
      attempts,
      status,
    });
  }

  return items;
}
