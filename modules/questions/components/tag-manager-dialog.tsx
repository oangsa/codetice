"use client";

import { useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { WorkspaceTag } from "@/lib/tags";

function sortTags(tags: WorkspaceTag[]) {
  return [...tags].sort((left, right) => (
    Number(right.isPreset) - Number(left.isPreset) || left.name.localeCompare(right.name)
  ));
}

export function TagManagerDialog({
  workspaceId,
  tags,
  onTagsChange,
}: {
  workspaceId: string;
  tags: WorkspaceTag[];
  onTagsChange: (tags: WorkspaceTag[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [renameValues, setRenameValues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<WorkspaceTag | null>(null);
  const presetTags = tags.filter((tag) => tag.isPreset);
  const localTags = tags.filter((tag) => !tag.isPreset);

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    setPending("create");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json() as { message?: string; tag?: WorkspaceTag };
      if (!response.ok || !data.tag) throw new Error(data.message ?? "Unable to create tag.");
      onTagsChange(sortTags([...tags, data.tag]));
      setNewTagName("");
      toast.success("Tag created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create tag.");
    } finally {
      setPending(null);
    }
  }

  async function renameTag(tag: WorkspaceTag) {
    const name = (renameValues[tag.id] ?? tag.name).trim();
    if (!name || name === tag.name) return;
    setPending(tag.id);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json() as { message?: string; tag?: WorkspaceTag };
      if (!response.ok || !data.tag) throw new Error(data.message ?? "Unable to rename tag.");
      onTagsChange(sortTags(tags.map((current) => current.id === tag.id ? data.tag! : current)));
      setRenameValues((current) => ({ ...current, [tag.id]: data.tag!.name }));
      toast.success("Tag renamed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rename tag.");
    } finally {
      setPending(null);
    }
  }

  async function deleteTag() {
    if (!tagToDelete) return;
    setPending(tagToDelete.id);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tags/${tagToDelete.id}`, { method: "DELETE" });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Unable to delete tag.");
      onTagsChange(tags.filter((tag) => tag.id !== tagToDelete.id));
      toast.success("Tag deleted and removed from its questions.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete tag.");
    } finally {
      setPending(null);
      setTagToDelete(null);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-full" onClick={() => setOpen(true)}>
        <Tags className="h-3.5 w-3.5" />Manage tags
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
            <DialogDescription>Shared teaching presets are read-only. Local tags are available only in this workspace.</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createTag();
                }
              }}
              placeholder="New local tag"
              maxLength={100}
            />
            <Button type="button" disabled={pending === "create" || !newTagName.trim()} onClick={() => void createTag()}>
              <Plus className="h-4 w-4" />Add
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shared presets</p>
              <div className="flex flex-wrap gap-2">
                {presetTags.map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace tags</p>
              {localTags.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">No local tags yet.</p>
              ) : (
                <div className="space-y-2">
                  {localTags.map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2">
                      <Input
                        value={renameValues[tag.id] ?? tag.name}
                        onChange={(event) => setRenameValues((current) => ({ ...current, [tag.id]: event.target.value }))}
                        maxLength={100}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        tooltip={`Rename ${tag.name}`}
                        disabled={pending === tag.id}
                        onClick={() => void renameTag(tag)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        tooltip={`Delete ${tag.name}`}
                        disabled={pending === tag.id}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setTagToDelete(tag)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(tagToDelete)} onOpenChange={(nextOpen) => !nextOpen && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete local tag?</AlertDialogTitle>
            <AlertDialogDescription>
              {tagToDelete ? `“${tagToDelete.name}” will be detached from every affected question before it is deleted.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={pending === tagToDelete?.id}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                disabled={pending === tagToDelete?.id}
                className="bg-red-600 hover:bg-red-700"
                onClick={() => void deleteTag()}
              >
                Delete tag
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
