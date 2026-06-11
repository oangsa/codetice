export function formatSubmissionStatusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "wrong_answer":
      return "Not correct";
    case "runtime_error":
      return "Runtime error";
    case "time_limit_exceeded":
      return "Time limit exceeded";
    case "memory_limit_exceeded":
      return "Memory limit exceeded";
    case "internal_error":
      return "System error";
    case "queued":
      return "Queued";
    case "running":
      return "Processing";
    default:
      return status.replaceAll("_", " ");
  }
}

export function formatSubmissionFeedback(status: string, passedCount?: number, totalCount?: number, score?: string) {
  const label = formatSubmissionStatusLabel(status);

  if (status === "accepted") {
    return `${label}. Passed ${passedCount ?? 0}/${totalCount ?? 0} tests. Score ${score ?? "0"}.`;
  }

  if (status === "queued") {
    return "Submission recorded and queued for grading.";
  }

  if (status === "running") {
    return "Submission is being graded.";
  }

  return `${label}. Passed ${passedCount ?? 0}/${totalCount ?? 0} tests. Score ${score ?? "0"}.`;
}
