"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Failed to change password.");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Password changed successfully.
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            placeholder="Enter your current password"
            className="pl-9"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            placeholder="Enter your new password"
            className="pl-9"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            maxLength={100}
            required
            autoComplete="new-password"
          />
        </div>
        <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your new password"
            className="pl-9"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            maxLength={100}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="pt-1">
        <Button type="submit" disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Change Password
        </Button>
      </div>
    </form>
  );
}
