export const MAX_GRADER_OUTPUT_BYTES = 65536;
export const DEFAULT_GRADING_JOB_LEASE_SECONDS = 900;
export const DEFAULT_GRADING_WORKER_POLL_MS = 2000;
export const GRADING_JOB_STATUSES = ["queued", "running", "completed", "failed"] as const;
