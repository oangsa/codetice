import { VerdictBadge, type VerdictVariant } from "@/components/commons/verdict-badge";

function getStatusVerdict(status: string): VerdictVariant {
  if (status === "accepted") {
    return "accepted";
  }

  if (status === "wrong_answer") {
    return "wrong";
  }

  if (status === "time_limit_exceeded") {
    return "tle";
  }

  if (status === "runtime_error") {
    return "runtime";
  }

  if (status === "memory_limit_exceeded") {
    return "mle";
  }

  return "compile";
}

export function SubmissionStatusBadge({ status }: { status: string }) {
  return (
    <VerdictBadge verdict={getStatusVerdict(status)} className="capitalize">
      {status.replaceAll("_", " ")}
    </VerdictBadge>
  );
}
