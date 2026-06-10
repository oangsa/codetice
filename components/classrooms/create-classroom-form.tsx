"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function CreateClassroomForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const response = await fetch("/api/classrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
      }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? "Unable to create classroom.");
      setPending(false);
      return;
    }

    toast.success("Classroom created.");
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
      <FormField label="Classroom name" htmlFor="name">
        <Input id="name" name="name" />
      </FormField>
      <Button type="submit" disabled={pending}>
        Create classroom
      </Button>
    </form>
  );
}
