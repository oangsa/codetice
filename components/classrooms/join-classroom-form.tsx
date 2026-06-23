"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Messages } from "@/lib/api.constants";

export function JoinClassroomForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setPending(true);
    const response = await fetch("/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? Messages.unableToJoinClassroom);
      setPending(false);
      return;
    }

    toast.success("Joined workspace.");
    router.refresh();
    setPending(false);
    setInviteCode("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-[40px] px-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-black dark:hover:bg-white/90 transition-all duration-300 ease-in-out flex items-center gap-2 cursor-pointer shrink-0">
          <LogIn className="w-3.5 h-3.5" />
          Join Workspace
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-[28px] bg-[var(--tint-sm)] border border-slate-200 dark:border-slate-800/60 p-2">
        <DialogHeader className="px-4 pt-4 text-left">
          <DialogTitle className="text-base font-semibold">Join Workspace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-code" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Invite code
            </Label>
            <Input
              id="invite-code"
              name="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. ABC123"
              required
              disabled={pending}
              className="rounded-full h-10 text-sm px-4"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !inviteCode.trim()}
              className="rounded-full"
            >
              {pending ? "Joining…" : "Join"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
