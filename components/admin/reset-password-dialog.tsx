"use client";

import { useState } from "react";
import { Loader2, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

interface ResetPasswordDialogProps {
  userId: string;
  username: string;
}

export function ResetPasswordDialog({ userId, username }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(value: boolean) {
    if (!pending) {
      setOpen(value);
      if (!value) {
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Failed to reset password.");
        return;
      }

      toast.success(`Password for ${username} has been reset.`);
      setOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for{" "}
            <span className="font-semibold text-foreground">{username}</span>. They will need to
            use this password to log in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reset-new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-new-password"
                type="password"
                placeholder="Enter new password"
                className="pl-9"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-confirm-password"
                type="password"
                placeholder="Confirm new password"
                className="pl-9"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                maxLength={100}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-1.5">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reset Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
