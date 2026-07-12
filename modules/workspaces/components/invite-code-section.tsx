"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0",
        className
      )}
      title="Copy invite code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Clipboard className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
