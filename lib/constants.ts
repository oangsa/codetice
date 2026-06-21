export const SESSION_COOKIE = "vibe_grader_session";
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
export const MAX_SUBMISSION_SOURCE_CHARS = 50000;
export const MAX_GRADER_OUTPUT_BYTES = 65536;
export const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key";
export const DEFAULT_GRADING_JOB_LEASE_SECONDS = 900;
export const DEFAULT_GRADING_WORKER_POLL_MS = 2000;
export const USER_ROLES = ["student", "admin"] as const;
export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const CHECKER_TYPES = [
  "exact",
  "ignore_trailing_whitespace",
  "ignore_all_whitespace",
  "floating_point_tolerance",
] as const;
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
export const GRADING_JOB_STATUSES = ["queued", "running", "completed", "failed"] as const;
