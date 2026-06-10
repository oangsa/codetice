"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

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

    const payload = {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { message?: string };

    if (!response.ok) {
      setError(data.message ?? "Request failed.");
      setPending(false);
      return;
    }

    toast.success(endpoint.includes("register") ? "Account created." : "Logged in.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          action={async (formData) => {
            await handleSubmit(formData);
          }}
        >
          <FormField label="Username" htmlFor="username" error={null}>
            <Input id="username" name="username" minLength={3} maxLength={50} required />
          </FormField>
          <FormField label="Password" htmlFor="password" error={error}>
            <Input id="password" name="password" type="password" minLength={8} required />
          </FormField>
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
