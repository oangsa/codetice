export const SESSION_COOKIE = "vibe_grader_session";
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
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

export const PYTHON_COMPLETIONS = [
  "def",
  "return",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "break",
  "continue",
  "import",
  "from",
  "class",
  "try",
  "except",
  "finally",
  "with",
  "print",
  "input",
  "len",
  "range",
  "map",
  "list",
  "dict",
  "set",
  "int",
  "float",
  "str",
  "sum",
  "min",
  "max",
];

export const SUPPORTED_LANGUAGE_SLUGS = ["python", "javascript", "typescript"] as const;
