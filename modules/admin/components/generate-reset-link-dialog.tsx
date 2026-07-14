"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Messages } from "@/lib/api.constants";

interface GenerateResetLinkDialogProps {
  userId: string;
  username: string;
}

export function GenerateResetLinkDialog({
  userId,
  username,
}: GenerateResetLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const expiresLabel = useMemo(() => {
    if (!expiresAt) {
      return null;
    }

    return new Date(expiresAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [expiresAt]);

  function handleOpenChange(value: boolean) {
    if (!pending) {
      setOpen(value);
      if (!value) {
        setError(null);
        setResetUrl(null);
        setExpiresAt(null);
      }
    }
  }

  async function handleGenerate() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password-link`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        message?: string;
        resetUrl?: string;
        expiresAt?: string;
      };

      if (!response.ok || !data.resetUrl || !data.expiresAt) {
        setError(data.message ?? Messages.unableToGenerateResetLink);
        return;
      }

      setResetUrl(data.resetUrl);
      setExpiresAt(data.expiresAt);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!resetUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(resetUrl);
      toast.success("Reset link copied.");
    } catch {
      toast.error(Messages.somethingWrong);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          tooltip="Generate password reset link"
          className="h-8 w-8"
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Reset Link</DialogTitle>
          <DialogDescription>
            Create a one-time password reset link for{" "}
            <span className="font-semibold text-foreground">{username}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {resetUrl ? (
            <div className="space-y-2">
              <Label htmlFor="reset-link">Reset Link</Label>
              <Input id="reset-link" value={resetUrl} readOnly />
              {expiresLabel ? (
                <p className="text-xs text-muted-foreground">Expires on {expiresLabel}.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              The previous unused reset link for this user will be invalidated immediately.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {resetUrl ? (
              <>
                <Button type="button" variant="outline" onClick={handleCopy} className="gap-1.5">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button type="button" variant="outline" asChild className="gap-1.5">
                  <a href={resetUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </Button>
              </>
            ) : null}
          </div>
          <Button type="button" onClick={handleGenerate} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {resetUrl ? "Generate New Link" : "Generate Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
