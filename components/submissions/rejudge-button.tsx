"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Messages } from "@/lib/api.constants";

export function RejudgeButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRejudge() {
    setPending(true);
    const response = await fetch(`/api/admin/rejudge/submissions/${submissionId}`, {
      method: "POST",
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? Messages.unableToRejudge);
      setPending(false);
      return;
    }

    toast.success("Submission queued for rejudge.");
    router.refresh();
    setPending(false);
  }

  return (
    <Button type="button" variant="outline" onClick={() => void handleRejudge()} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Rejudge
    </Button>
  );
}
