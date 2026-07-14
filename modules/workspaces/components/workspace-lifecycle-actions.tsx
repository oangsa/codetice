"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Pencil, ShieldCheck, Trash2 } from "lucide-react";
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
import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Messages } from "@/lib/api.constants";

type WorkspaceOwner = { id: string; username: string };

export function WorkspaceLifecycleActions({
  workspaceId,
  workspaceName,
  owner,
  ownershipCandidates,
}: {
  workspaceId: string;
  workspaceName: string;
  owner: WorkspaceOwner;
  ownershipCandidates: WorkspaceOwner[];
}) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [name, setName] = useState(workspaceName);
  const alternativeOwners = ownershipCandidates.filter((candidate) => candidate.id !== owner.id);
  const [nextOwnerId, setNextOwnerId] = useState(alternativeOwners[0]?.id ?? "");
  const [pendingAction, setPendingAction] = useState<"edit" | "transfer" | "delete" | null>(null);

  function resetEdit() {
    setName(workspaceName);
  }

  function resetTransfer() {
    setNextOwnerId(alternativeOwners[0]?.id ?? "");
  }

  async function readResponse(response: Response, fallback: string) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) throw new Error(payload.message ?? fallback);
  }

  async function saveName() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setPendingAction("edit");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      await readResponse(response, Messages.unableToUpdateWorkspace);
      toast.success("Workspace name updated.");
      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : Messages.unableToUpdateWorkspace);
    } finally {
      setPendingAction(null);
    }
  }

  async function transferOwnership() {
    if (!nextOwnerId) return;
    setPendingAction("transfer");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: nextOwnerId }),
      });
      await readResponse(response, Messages.unableToTransferWorkspaceOwnership);
      toast.success("Workspace ownership transferred.");
      setIsTransferOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : Messages.unableToTransferWorkspaceOwnership);
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteWorkspace() {
    setPendingAction("delete");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      await readResponse(response, Messages.unableToDeleteWorkspace);
      toast.success("Workspace deleted.");
      setIsDeleteOpen(false);
      router.replace("/workspaces");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : Messages.unableToDeleteWorkspace);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" tooltip="Workspace settings" className="h-9 w-9 rounded-full">
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Pencil />Edit workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsTransferOpen(true)}>
            <ShieldCheck />Transfer ownership
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-700" onSelect={() => setIsDeleteOpen(true)}>
            <Trash2 />Delete workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) resetEdit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit workspace</DialogTitle>
            <DialogDescription>Update the name shown to workspace members.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveName();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="workspace-lifecycle-name">Workspace name</Label>
              <Input
                id="workspace-lifecycle-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                disabled={pendingAction !== null}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={pendingAction !== null}>Cancel</Button>
              <Button type="submit" disabled={pendingAction !== null || !name.trim()}>{pendingAction === "edit" ? "Saving…" : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTransferOpen}
        onOpenChange={(open) => {
          setIsTransferOpen(open);
          if (!open) resetTransfer();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer workspace ownership</DialogTitle>
            <DialogDescription>
              The current owner is <span className="font-medium text-foreground">{owner.username}</span>. Only global administrators can own a workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void transferOwnership();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="workspace-new-owner">New owner</Label>
              <Select value={nextOwnerId} onValueChange={setNextOwnerId} disabled={pendingAction !== null || alternativeOwners.length === 0}>
                <SelectTrigger id="workspace-new-owner">
                  <SelectValue placeholder="Select an administrator" />
                </SelectTrigger>
                <SelectContent>
                  {alternativeOwners.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.username}</SelectItem>)}
                </SelectContent>
              </Select>
              {alternativeOwners.length === 0 ? <p className="text-sm text-muted-foreground">Add another global administrator before transferring ownership.</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)} disabled={pendingAction !== null}>Cancel</Button>
              <Button type="submit" disabled={pendingAction !== null || !nextOwnerId}>{pendingAction === "transfer" ? "Transferring…" : "Transfer ownership"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{workspaceName}</span> and its questions, members, submissions, tags, and grading history will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={pendingAction !== null}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={pendingAction !== null}
                onClick={(event) => {
                  event.preventDefault();
                  void deleteWorkspace();
                }}
              >
                {pendingAction === "delete" ? "Deleting…" : "Delete workspace"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
