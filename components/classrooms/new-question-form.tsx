"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Textarea } from "@/components/ui/textarea";
import { Messages } from "@/lib/api.constants";

type Testcase = {
  id: string; // local id for React key
  name: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
};

function newTestcase(): Testcase {
  return {
    id: crypto.randomUUID(),
    name: "",
    input: "",
    expectedOutput: "",
    isSample: false,
    isHidden: true,
  };
}

export function NewQuestionForm({
  classroomId,
  languages = [],
}: {
  classroomId: string;
  languages?: Array<{ id: string; slug: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [difficulty, setDifficulty] = useState("easy");
  const [testcases, setTestcases] = useState<Testcase[]>([newTestcase()]);

  function addTestcase() {
    setTestcases((prev) => [...prev, newTestcase()]);
  }

  function removeTestcase(id: string) {
    setTestcases((prev) => prev.filter((tc) => tc.id !== id));
  }

  function updateTestcase(id: string, field: keyof Testcase, value: string | boolean) {
    setTestcases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)));
  }

  async function handleTxtUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const inputs: Record<string, string> = {};
    const outputs: Record<string, string> = {};

    await Promise.all(
      files.map(async (file) => {
        const match = file.name.match(/^(\d+)(in|out)\.txt$/i);
        if (!match) return;
        const [, num, type] = match;
        const content = await file.text();
        if (type!.toLowerCase() === "in") inputs[num!] = content;
        else outputs[num!] = content;
      }),
    );

    const allNums = [...new Set([...Object.keys(inputs), ...Object.keys(outputs)])];
    allNums.sort((a, b) => Number(a) - Number(b));

    if (allNums.length === 0) {
      toast.error("No valid files found. Name files like '1in.txt' and '1out.txt'.");
      e.target.value = "";
      return;
    }

    const newCases: Testcase[] = allNums.map((num) => ({
      id: crypto.randomUUID(),
      name: `Test ${num}`,
      input: inputs[num] ?? "",
      expectedOutput: outputs[num] ?? "",
      isSample: false,
      isHidden: true,
    }));

    // Replace the empty placeholder if it exists, then add new ones
    setTestcases((prev) => {
      const nonEmpty = prev.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
      return [...nonEmpty, ...newCases];
    });
    toast.success(`Imported ${newCases.length} testcase(s).`);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const allowedLanguages = data.getAll("allowedLanguages").map(String);

    const body = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      difficulty,
      totalScore: Number(data.get("totalScore") ?? 100),
      timeLimitMs: Number(data.get("timeLimitMs") ?? 2000),
      memoryLimitMb: Number(data.get("memoryLimitMb") ?? 128),
      starterCode: String(data.get("starterCode") ?? ""),
      isPublished: data.get("isPublished") === "on",
      assignmentTitle: String(data.get("assignmentTitle") ?? "General"),
      assignmentDueAt: String(data.get("assignmentDueAt") ?? "") || null,
      allowedLanguages,
      testcases: testcases.map((tc, index) => ({
        name: tc.name || undefined,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample,
        isHidden: tc.isHidden,
        sortOrder: index,
      })),
    };

    const response = await fetch(`/api/classrooms/${classroomId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as {
      message?: string;
      question?: { id: string; slug: string };
    };

    if (!response.ok) {
      toast.error(json.message ?? Messages.unableToCreateQuestion);
      setPending(false);
      return;
    }

    toast.success("Question created and added to classroom.");
    router.push(`/classrooms/${classroomId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question details */}
      <Card className="rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-card text-card-foreground shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>Question details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Title" htmlFor="title" required>
            <Input id="title" name="title" required />
          </FormField>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Description <span className="ml-0.5 text-red-500">*</span></label>
            <MarkdownEditor name="description" required rows={8} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Difficulty" htmlFor="difficulty">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty" className="w-full bg-background border border-input rounded-full h-9 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Total score" htmlFor="totalScore">
              <Input id="totalScore" name="totalScore" type="number" defaultValue={100} />
            </FormField>
            <FormField label="Time limit (ms)" htmlFor="timeLimitMs">
              <Input id="timeLimitMs" name="timeLimitMs" type="number" defaultValue={2000} />
            </FormField>
            <FormField label="Memory (MB)" htmlFor="memoryLimitMb">
              <Input id="memoryLimitMb" name="memoryLimitMb" type="number" defaultValue={128} />
            </FormField>
          </div>
          <FormField label="Starter code" htmlFor="starterCode">
            <Textarea
              id="starterCode"
              name="starterCode"
              rows={3}
              placeholder="Optional starter code for students"
            />
          </FormField>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Accepted Languages</label>
            <div className="flex flex-wrap gap-6 rounded-md border border-slate-200 dark:border-slate-800 p-4 bg-slate-800">
              {languages.map((lang) => (
                <label key={lang.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowedLanguages"
                    value={lang.slug}
                    defaultChecked={true}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>{lang.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Select which languages are allowed for this question. If none are selected, all languages will be accepted.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Assignment name" htmlFor="assignmentTitle" required>
              <Input
                id="assignmentTitle"
                name="assignmentTitle"
                defaultValue="General"
                required
              />
            </FormField>
            <FormField label="Due date (optional)" htmlFor="assignmentDueAt">
              <Input id="assignmentDueAt" name="assignmentDueAt" type="datetime-local" />
            </FormField>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Published</p>
              <p className="text-xs text-slate-500">Visible to students immediately.</p>
            </div>
            <Switch name="isPublished" />
          </div>
        </CardContent>
      </Card>

      {/* Testcases */}
      <Card className="rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-card text-card-foreground shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Testcases</CardTitle>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".txt"
                className="sr-only"
                onChange={handleTxtUpload}
              />
              <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-800">
                <Upload className="h-3.5 w-3.5" />
                Upload .txt
              </span>
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={addTestcase}>
              <Plus className="h-4 w-4" />
              Add testcase
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {testcases.map((tc, index) => (
            <div key={tc.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">
                  Testcase {index + 1}
                  {tc.isSample && (
                    <Badge variant="secondary" className="ml-2">
                      Sample
                    </Badge>
                  )}
                  {!tc.isHidden && (
                    <Badge variant="default" className="ml-2">
                      Visible
                    </Badge>
                  )}
                </div>
                {testcases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestcase(tc.id)}
                    title="Delete testcase"
                    className="inline-flex items-center justify-center h-8 w-8 rounded text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Input
                  </Label>
                  <Textarea
                    rows={3}
                    value={tc.input}
                    onChange={(e) => updateTestcase(tc.id, "input", e.target.value)}
                    placeholder="stdin input"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Expected output
                  </Label>
                  <Textarea
                    rows={3}
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestcase(tc.id, "expectedOutput", e.target.value)}
                    placeholder="expected stdout"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tc.isSample}
                    onCheckedChange={(v) => updateTestcase(tc.id, "isSample", v)}
                    id={`sample-${tc.id}`}
                  />
                  <Label htmlFor={`sample-${tc.id}`} className="cursor-pointer text-sm">
                    Sample (visible to students)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!tc.isHidden}
                    onCheckedChange={(v) => updateTestcase(tc.id, "isHidden", !v)}
                    id={`hidden-${tc.id}`}
                  />
                  <Label htmlFor={`hidden-${tc.id}`} className="cursor-pointer text-sm">
                    Show output to students
                  </Label>
                </div>
                <Input
                  className="w-40"
                  placeholder="Name (optional)"
                  value={tc.name}
                  onChange={(e) => updateTestcase(tc.id, "name", e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="rounded-full h-9 font-semibold">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create question
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full h-9 font-semibold">
          Cancel
        </Button>
      </div>
    </form>
  );
}
