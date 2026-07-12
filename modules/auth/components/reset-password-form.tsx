"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, KeyRound, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Messages } from "@/lib/api.constants";

export function ResetPasswordForm({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 1) {
      setError("Password cannot be empty.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? Messages.unableToResetPassword);
        return;
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-800 pb-5">
        <CardTitle className="text-xl">Reset Password</CardTitle>
        <CardDescription>Use the one-time reset link or paste the reset token below.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Password reset successfully. You can sign in now.
            </div>
          ) : null}

          <FormField label="Reset Token" htmlFor="token" error={null} required>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="token"
                name="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pl-9"
                placeholder="Paste your reset token"
                required
              />
            </div>
          </FormField>

          <FormField label="New Password" htmlFor="new-password" error={null} required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9"
                maxLength={100}
                autoComplete="new-password"
                placeholder="Enter your new password"
                required
              />
            </div>
          </FormField>

          <FormField label="Confirm Password" htmlFor="confirm-password" error={null} required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9"
                maxLength={100}
                autoComplete="new-password"
                placeholder="Confirm your new password"
                required
              />
            </div>
          </FormField>

          <Button className="mt-1 w-full gap-1.5" disabled={pending} type="submit">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reset Password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700"
          >
            Back to login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
