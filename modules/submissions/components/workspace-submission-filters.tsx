"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkspaceSubmissionFilters({
  questions,
  students,
}: {
  questions: Array<{ id: string; title: string }>;
  students: Array<{ id: string; username: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key); else next.set(key, value);
    next.delete("cursor");
    router.push(`?${next.toString()}`);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("questionId") ?? "all"} onValueChange={(value) => update("questionId", value)}>
        <SelectTrigger className="h-9 w-52 rounded-full"><SelectValue placeholder="All questions" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All questions</SelectItem>{questions.map((question) => <SelectItem key={question.id} value={question.id}>{question.title}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={params.get("studentId") ?? "all"} onValueChange={(value) => update("studentId", value)}>
        <SelectTrigger className="h-9 w-48 rounded-full"><SelectValue placeholder="All students" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All students</SelectItem>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.username}</SelectItem>)}</SelectContent>
      </Select>
      <Button className="h-9 rounded-full" variant="outline" onClick={() => router.push("?")}>Clear</Button>
    </div>
  );
}
