"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Messages } from "@/lib/api.constants";

export function CreateAssignmentForm({
  classrooms,
  questions,
}: {
  classrooms: Array<{ id: string; name: string }>;
  questions: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const response = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroomId: String(formData.get("classroomId") ?? ""),
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        startAt: String(formData.get("startAt") ?? "") || null,
        dueAt: String(formData.get("dueAt") ?? "") || null,
        questionIds: formData.getAll("questionIds").map(String),
      }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? Messages.unableToCreateAssignment);
      setPending(false);
      return;
    }

    toast.success("Assignment created.");
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
      <FormField label="Title" htmlFor="title" required>
        <Input id="title" name="title" />
      </FormField>
      <FormField label="Description" htmlFor="description">
        <Textarea id="description" name="description" />
      </FormField>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Workspace" htmlFor="classroomId" required>
          <select id="classroomId" name="classroomId" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Start" htmlFor="startAt">
          <Input id="startAt" name="startAt" type="datetime-local" />
        </FormField>
        <FormField label="Due" htmlFor="dueAt">
          <Input id="dueAt" name="dueAt" type="datetime-local" />
        </FormField>
      </div>
      <FormField label="Questions" htmlFor="questionIds" required>
        <div className="grid gap-2 rounded-md border border-slate-200 p-3">
          {questions.map((question) => (
            <label key={question.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="questionIds" value={question.id} />
              <span>{question.title}</span>
            </label>
          ))}
        </div>
      </FormField>
      <Button type="submit" disabled={pending}>
        Create assignment
      </Button>
    </form>
  );
}
