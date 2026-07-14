"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type CloneSelection = { include: boolean; isPublished: boolean };

function initialSelections(questions: Array<{ id: string }>) {
  return Object.fromEntries(questions.map((question) => [question.id, { include: true, isPublished: false }])) as Record<string, CloneSelection>;
}

export function WorkspaceCloneDialog({
  workspaceId,
  workspaceName,
  questions,
}: {
  workspaceId: string;
  workspaceName: string;
  questions: Array<{ id: string; title: string; isPublished: boolean; testcaseCount: number }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selections, setSelections] = useState<Record<string, CloneSelection>>(() => initialSelections(questions));
  const [pending, setPending] = useState(false);
  const publishableQuestions = questions.filter((question) => question.testcaseCount > 0);
  const publishAll = publishableQuestions.length > 0 && publishableQuestions.every((question) => {
    const selection = selections[question.id] ?? { include: false, isPublished: false };
    return selection.include && selection.isPublished;
  });

  function reset() {
    setName("");
    setSelections(initialSelections(questions));
  }

  function setPublishAll(isPublished: boolean) {
    setSelections((current) => Object.fromEntries(questions.map((question) => {
      const selection = current[question.id] ?? { include: true, isPublished: false };
      return [question.id, {
        include: isPublished ? true : selection.include,
        isPublished: isPublished && question.testcaseCount > 0,
      }];
    })) as Record<string, CloneSelection>);
  }

  async function cloneWorkspace() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setPending(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          questions: questions.map((question) => ({
            questionId: question.id,
            include: selections[question.id]?.include ?? false,
            isPublished: selections[question.id]?.isPublished ?? false,
          })),
        }),
      });
      const data = await response.json() as { message?: string; workspace?: { id: string } };
      if (!response.ok || !data.workspace) throw new Error(data.message ?? "Unable to clone workspace.");
      toast.success("Workspace cloned.");
      setOpen(false);
      router.push(`/workspaces/${data.workspace.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to clone workspace.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      <Button type="button" variant="outline" size="sm" className="h-9 rounded-full" onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" />Clone workspace
      </Button>
      <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clone {workspaceName}</DialogTitle>
          <DialogDescription>Memberships, invitations, submissions, scores, and grading history are not copied. Selected questions start as drafts unless you publish them below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-workspace-name">New workspace name</Label>
            <Input id="clone-workspace-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">Questions</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="clone-workspace-publish-all" className="text-xs text-muted-foreground">Publish all</Label>
                <Switch
                  id="clone-workspace-publish-all"
                  checked={publishAll}
                  disabled={publishableQuestions.length === 0}
                  onCheckedChange={setPublishAll}
                />
              </div>
            </div>
            {questions.some((question) => question.testcaseCount === 0) ? (
              <p className="text-xs text-muted-foreground">Questions without test cases will remain drafts.</p>
            ) : null}
            <div className="max-h-[45dvh] overflow-y-auto overscroll-contain rounded-md border">
              {questions.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground">This workspace has no questions to copy.</p>
              ) : questions.map((question) => {
                const selection = selections[question.id] ?? { include: false, isPublished: false };
                return (
                  <div key={question.id} className="flex flex-wrap items-center gap-3 border-b px-3 py-3 last:border-b-0">
                    <Checkbox
                      id={`clone-question-${question.id}`}
                      checked={selection.include}
                      onCheckedChange={(checked) => setSelections((current) => ({
                        ...current,
                        [question.id]: { ...selection, include: checked === true, isPublished: checked === true ? selection.isPublished : false },
                      }))}
                    />
                    <Label htmlFor={`clone-question-${question.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate text-sm font-medium">{question.title}</span>
                      <span className="text-xs text-muted-foreground">{question.testcaseCount} test case{question.testcaseCount === 1 ? "" : "s"}</span>
                    </Label>
                    <div className="ml-auto flex items-center gap-2">
                      <Label htmlFor={`clone-question-publish-${question.id}`} className="text-xs text-muted-foreground">Publish</Label>
                      <Switch
                        id={`clone-question-publish-${question.id}`}
                        checked={selection.isPublished}
                        disabled={!selection.include || question.testcaseCount === 0}
                        onCheckedChange={(isPublished) => setSelections((current) => ({
                          ...current,
                          [question.id]: { ...selection, isPublished },
                        }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" disabled={pending || !name.trim()} onClick={() => void cloneWorkspace()}>
            <Copy className="h-4 w-4" />{pending ? "Cloning…" : "Clone workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
