"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api.constants";

type RejudgeTarget =
  | { kind: "submission"; id: string }
  | { kind: "question"; id: string };

export function WorkspaceRejudgeButton({
  workspaceId,
  target,
}: {
  workspaceId: string;
  target: RejudgeTarget;
}) {
  const [pending, setPending] = useState(false);

  async function rejudge() {
    setPending(true);
    const endpoint = target.kind === "submission"
      ? `/api/workspaces/${workspaceId}/submissions/${target.id}/rejudge`
      : `/api/workspaces/${workspaceId}/questions/${target.id}/rejudge`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { [IDEMPOTENCY_KEY_HEADER]: crypto.randomUUID() },
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Unable to queue rejudge.");
      }
      toast.success("Rejudge queued. Existing grading history is unchanged.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue rejudge.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={rejudge}>
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {pending ? "Queueing…" : "Rejudge"}
    </Button>
  );
}
