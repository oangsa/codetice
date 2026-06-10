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

  return (
    <Badge
      variant={variant}
      className="border border-white/10 bg-white/[0.04] px-2.5 py-1 uppercase tracking-[0.08em]"
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
