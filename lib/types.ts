export type AuthSession = {
  userId: string;
  role: "student" | "admin";
  tokenVersion: number;
};

export type SessionUser = {
  userId: string;
  username: string;
  role: "student" | "admin";
  profilePicture: string;
  tokenVersion: number;
};

export type VisibleTestcaseResult = {
  testcaseId: string;
  name: string | null;
  passed: boolean;
  status: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  expectedOutput: string | null;
  actualOutput: string | null;
  errorMessage: string | null;
  isHidden: boolean;
};
