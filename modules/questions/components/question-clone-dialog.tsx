"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function QuestionCloneDialog({
  workspaceId,
  question,
  targets,
}: {
  workspaceId: string;
  question: { id: string; title: string };
  targets: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const defaultTargetId = targets.find((target) => target.id === workspaceId)?.id ?? targets[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(defaultTargetId);
  const [isPublished, setIsPublished] = useState(false);
  const [pending, setPending] = useState(false);

  async function cloneQuestion() {
    if (!targetWorkspaceId) return;
    setPending(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/questions/${question.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWorkspaceId, isPublished }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Unable to clone question.");
      toast.success("Question cloned.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to clone question.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="contents" onClick={(event) => event.stopPropagation()}>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          tooltip={`Clone ${question.title}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone question</DialogTitle>
            <DialogDescription>Copy “{question.title}” into a workspace you manage. The clone starts as a draft unless you publish it here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`clone-target-${question.id}`}>Target workspace</Label>
              <Select value={targetWorkspaceId} onValueChange={setTargetWorkspaceId}>
                <SelectTrigger id={`clone-target-${question.id}`}><SelectValue placeholder="Select a workspace" /></SelectTrigger>
                <SelectContent>
                  {targets.map((target) => <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor={`clone-publish-${question.id}`}>Publish clone</Label>
                <p className="text-xs text-muted-foreground">Students can see it immediately.</p>
              </div>
              <Switch id={`clone-publish-${question.id}`} checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" disabled={pending || !targetWorkspaceId} onClick={() => void cloneQuestion()}>
              <Copy className="h-4 w-4" />{pending ? "Cloning…" : "Clone question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}
