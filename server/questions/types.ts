export type TestcaseInput = {
  name?: string | null;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
  checkerType?: string;
  floatTolerance?: number | null;
  sortOrder: number;
};

export type QuestionInput = {
  title: string;
  description: string;
  difficulty: string;
  totalScore: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  starterCode?: string | null;
  starterCodeByLanguage?: Record<string, string | null> | null;
  allowedLanguages?: string[] | null;
  tagIds: string[];
  isPublished: boolean;
};
