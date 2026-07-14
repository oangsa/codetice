"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/button";
import { Messages } from "@/lib/api.constants";

export function InviteCodeSection({ inviteCode, className }: { inviteCode: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(Messages.somethingWrong);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant="ghost"
      size="icon"
      className={cn(
        "h-5 w-5 shrink-0 rounded-full p-0 text-slate-400 hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
        className
      )}
      tooltip="Copy invite code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Clipboard className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
