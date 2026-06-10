"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function JoinClassroomForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const response = await fetch("/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode: String(formData.get("inviteCode") ?? ""),
      }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? "Unable to join classroom.");
      setPending(false);
      return;
    }

    toast.success("Joined classroom.");
    router.refresh();
    setPending(false);
  }

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        await handleSubmit(formData);
      }}
    >
      <FormField label="Invite code" htmlFor="inviteCode">
        <Input id="inviteCode" name="inviteCode" placeholder="ABC123" />
      </FormField>
      <Button type="submit" disabled={pending}>
        Join classroom
      </Button>
    </form>
  );
}
