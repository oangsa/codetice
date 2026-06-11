import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "outline" | "secondary" | "destructive";

export function SubmissionStatusBadge({ status }: { status: string }) {
  const variant: BadgeVariant =
    status === "accepted"
      ? "default"
      : status === "wrong_answer"
        ? "secondary"
        : status === "runtime_error" || status === "internal_error"
          ? "destructive"
          : status === "time_limit_exceeded"
            ? "secondary"
            : "outline";

  return (
    <Badge variant={variant} className="capitalize">
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
