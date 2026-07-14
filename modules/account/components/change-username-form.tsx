"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Messages } from "@/lib/api.constants";

export function ChangeUsernameForm({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (username === initialUsername) {
      toast.info("Username is already set to this value.");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/me/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? Messages.unableToUpdateUsername);
        return;
      }

      setSuccess(true);
      toast.success("Username updated successfully.");
      router.refresh();
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
          Username changed successfully.
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="username-input"
              name="username"
              type="text"
              placeholder="Enter new username"
              className="pl-9"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          <Button
            type="submit"
            disabled={pending || username === initialUsername}
            className="gap-1.5 shadow-sm hover:shadow transition-all shrink-0"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          3-20 characters. Letters, numbers, and underscores only.
        </p>
      </div>
    </form>
  );
}
