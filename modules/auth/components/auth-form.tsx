"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Messages } from "@/lib/api.constants";

export function AuthForm({
  title,
  description,
  endpoint,
  submitLabel,
}: {
  title: string;
  description: string;
  endpoint: "/api/auth/login" | "/api/auth/register";
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    try {
      const payload = {
        username: String(formData.get("username") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { message?: string } = {};
      const responseText = await response.text();
      try {
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch {
        // Safe fallback for non-JSON responses
      }

      if (!response.ok) {
        setError(data.message ?? (responseText || "Request failed."));
        setPending(false);
        return;
      }

      toast.success(endpoint.includes("register") ? "Account created." : "Logged in.");
      router.push("/workspaces");
      router.refresh();
    } catch {
      setError(Messages.somethingWrong);
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm rounded-[30px] border bg-card shadow-sm">
      <CardHeader className="border-b pb-5">
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-5">
        <form
          className="flex flex-col gap-4"
          action={async (formData) => {
            await handleSubmit(formData);
          }}
        >
          {error ? (
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : null}
          <FormField label="Username" htmlFor="username" error={null} required>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="username"
                name="username"
                minLength={3}
                maxLength={50}
                required
                className="pl-9"
                placeholder="Enter your username"
              />
            </div>
          </FormField>
          <FormField label="Password" htmlFor="password" error={null} required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="pl-9"
                placeholder="Enter your password"
              />
            </div>
          </FormField>
          <Button className="mt-1 w-full" disabled={pending} type="submit">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
