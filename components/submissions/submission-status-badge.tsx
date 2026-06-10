import { Badge } from "@/components/ui/badge";

export function SubmissionStatusBadge({ status }: { status: string }) {
  const variant =
    status === "accepted"
      ? "success"
      : status === "wrong_answer"
        ? "warning"
        : status === "runtime_error" || status === "internal_error"
          ? "destructive"
          : status === "time_limit_exceeded"
            ? "warning"
            : "default";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}
