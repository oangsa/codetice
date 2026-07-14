"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Messages } from "@/lib/api.constants";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? Messages.unableToCreateWorkspace);
      setPending(false);
      return;
    }

    toast.success("Workspace created.");
    router.refresh();
    setPending(false);
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          tooltip="Create workspace"
          className="h-[40px] shrink-0 rounded-full bg-slate-900 px-5 text-xs font-bold text-white transition-all duration-300 ease-in-out hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          <Plus className="w-3.5 h-3.5" />
          New Workspace
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-[28px] bg-[var(--tint-sm)] border border-slate-200 dark:border-slate-800/60 p-2">
        <DialogHeader className="px-4 pt-4 text-left">
          <DialogTitle className="text-base font-semibold">Create Workspace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Workspace name
            </Label>
            <Input
              id="workspace-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CS101 — Introduction to Programming"
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
              disabled={pending || !name.trim()}
              className="rounded-full"
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
