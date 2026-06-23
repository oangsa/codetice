export const MAX_SUBMISSION_SOURCE_CHARS = 50000;
export const SUBMISSION_STATUSES = [
  "queued",
  "running",
  "accepted",
  "wrong_answer",
  "runtime_error",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "internal_error",
] as const;
