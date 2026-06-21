"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Plus, Trash2, Upload } from "lucide-react";

import { TestcaseDialog } from "@/components/questions/testcase-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_DIFFICULTIES } from "@/lib/constants";

type CreateTestcase = {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
};

function newCreateTestcase(): CreateTestcase {
  return {
    id: crypto.randomUUID(),
    name: "",
    input: "",
    expectedOutput: "",
    isSample: false,
    isHidden: true,
  };
}

export function QuestionForm({
  mode,
  question,
  languages = [],
  classroomId,
  backUrl,
}: {
  mode: "create" | "edit";
  languages?: Array<{ id: string; slug: string; name: string }>;
  classroomId?: string;
  backUrl?: string;
  question?: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    totalScore: string;
    timeLimitMs: number;
    memoryLimitMb: number;
    starterCode: string | null;
    starterCodeByLanguage: Record<string, string>;
    allowedLanguages?: string[] | null;
    isPublished: boolean;
    testcases: Array<{
      id: string;
      name: string | null;
      input: string;
      expectedOutput: string;
      isSample: boolean;
      isHidden: boolean;
      checkerType: string;
      floatTolerance: string | null;
      sortOrder: number;
    }>;
  };
}) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? "easy");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createTestcases, setCreateTestcases] = useState<CreateTestcase[]>([newCreateTestcase()]);
  const [assignmentTitle, setAssignmentTitle] = useState("General");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");

  // Derive initial allowed languages: empty array means "all languages"
  const [allowedLangs, setAllowedLangs] = useState<string[]>(
    question?.allowedLanguages ?? [],
  );
  const isClassroomCreate = mode === "create" && Boolean(classroomId);

  function addCreateTestcase() {
    setCreateTestcases((prev) => [...prev, newCreateTestcase()]);
  }

  function removeCreateTestcase(id: string) {
    setCreateTestcases((prev) => prev.filter((tc) => tc.id !== id));
  }

  function updateCreateTestcase(
    id: string,
    field: keyof CreateTestcase,
    value: string | boolean,
  ) {
    setCreateTestcases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)),
    );
  }

  async function handleTxtUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

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
      setUploading(false);
      e.target.value = "";
      return;
    }

    if (isClassroomCreate) {
      const importedCases: CreateTestcase[] = allNums.map((num) => ({
        id: crypto.randomUUID(),
        name: `Test ${num}`,
        input: inputs[num] ?? "",
        expectedOutput: outputs[num] ?? "",
        isSample: false,
        isHidden: true,
      }));

      setCreateTestcases((prev) => {
        const nonEmpty = prev.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
        return [...nonEmpty, ...importedCases];
      });

      toast.success(`Imported ${importedCases.length} testcase(s).`);
      setUploading(false);
      e.target.value = "";
      return;
    }

    if (!question?.id) {
      setUploading(false);
      e.target.value = "";
      return;
    }

    let created = 0;
    for (const num of allNums) {
      const res = await fetch(`/api/questions/${question.id}/testcases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Test ${num}`,
          input: inputs[num] ?? "",
          expectedOutput: outputs[num] ?? "",
          isSample: false,
          isHidden: true,
          checkerType: "exact",
          sortOrder: Number(num) - 1,
        }),
      });
      if (res.ok) created++;
    }

    toast.success(`Imported ${created} of ${allNums.length} testcase(s).`);
    setUploading(false);
    e.target.value = "";
    window.location.reload();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      difficulty,
      totalScore: Number(formData.get("totalScore") ?? 100),
      timeLimitMs: Number(formData.get("timeLimitMs") ?? 2000),
      memoryLimitMb: Number(formData.get("memoryLimitMb") ?? 128),
      starterCode: String(formData.get("starterCode") ?? ""),
      allowedLanguages: allowedLangs,
      isPublished: formData.get("isPublished") === "on",
    };

    const endpoint =
      mode === "create"
        ? classroomId
          ? `/api/classrooms/${classroomId}/questions`
          : "/api/questions"
        : `/api/questions/${question?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const finalPayload =
      isClassroomCreate
        ? {
            ...payload,
            assignmentTitle,
            assignmentDueAt: assignmentDueAt || null,
            testcases: createTestcases.map((tc, index) => ({
              name: tc.name || undefined,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isSample: tc.isSample,
              isHidden: tc.isHidden,
              sortOrder: index,
            })),
          }
        : payload;

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPayload),
    });
    const data = (await response.json()) as { message?: string; question?: { id: string } };

    if (!response.ok) {
      toast.error(data.message ?? "Unable to save question.");
      setPending(false);
      return;
    }

    toast.success(mode === "create" ? "Question created." : "Question updated.");
    if (backUrl) {
      router.push(backUrl);
    } else if (classroomId) {
      router.push(`/classrooms/${classroomId}`);
    } else {
      router.push(mode === "create" ? `/admin/questions/${data.question?.id}/edit` : "/classrooms");
    }
    router.refresh();
  }

  async function handleDeleteTestcase(testcaseId: string) {
    const response = await fetch(`/api/questions/${question?.id}/testcases/${testcaseId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Unable to delete testcase.");
      return;
    }

    toast.success("Testcase deleted.");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-card text-card-foreground shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create question" : "Edit question"}</CardTitle>
          <CardDescription>Define the prompt, limits, score, starter code, and publish state.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            action={async (formData) => {
              await handleSubmit(formData);
            }}
          >
            <FormField label="Title" htmlFor="title">
              <Input id="title" name="title" defaultValue={question?.title ?? ""} required />
            </FormField>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <MarkdownEditor
                name="description"
                defaultValue={question?.description ?? ""}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Difficulty" htmlFor="difficulty">
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty" className="w-full bg-background border border-input rounded-full h-9 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_DIFFICULTIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Total score" htmlFor="totalScore">
                <Input id="totalScore" name="totalScore" type="number" defaultValue={question?.totalScore ?? "100"} />
              </FormField>
              <FormField label="Time limit (ms)" htmlFor="timeLimitMs">
                <Input id="timeLimitMs" name="timeLimitMs" type="number" defaultValue={question?.timeLimitMs ?? 2000} />
              </FormField>
              <FormField label="Memory limit (MB)" htmlFor="memoryLimitMb">
                <Input
                  id="memoryLimitMb"
                  name="memoryLimitMb"
                  type="number"
                  defaultValue={question?.memoryLimitMb ?? 128}
                />
              </FormField>
            </div>
            <FormField label="Starter code" htmlFor="starterCode">
              <Textarea id="starterCode" name="starterCode" defaultValue={question?.starterCode ?? ""} />
            </FormField>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="allowedLanguages">
                Accepted Languages
              </label>
              <MultiSelect
                id="allowedLanguages"
                options={languages.map((l) => ({ value: l.slug, label: l.name }))}
                value={allowedLangs}
                onChange={setAllowedLangs}
                placeholder="All languages allowed"
              />
              <p className="text-xs text-slate-500">
                Select which languages are allowed for this question. Leave empty to allow all languages.
              </p>
            </div>
            {isClassroomCreate ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Assignment name" htmlFor="assignmentTitle">
                  <Input
                    id="assignmentTitle"
                    name="assignmentTitle"
                    value={assignmentTitle}
                    onChange={(event) => setAssignmentTitle(event.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Due date (optional)" htmlFor="assignmentDueAt">
                  <Input
                    id="assignmentDueAt"
                    name="assignmentDueAt"
                    type="datetime-local"
                    value={assignmentDueAt}
                    onChange={(event) => setAssignmentDueAt(event.target.value)}
                  />
                </FormField>
              </div>
            ) : null}
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Published</p>
                <p className="text-xs text-slate-500">Only published questions are visible to students.</p>
              </div>
              <Switch name="isPublished" defaultChecked={question?.isPublished ?? false} />
            </div>
             <div className="flex items-center gap-3">
               <Button type="submit" disabled={pending} className="rounded-full h-9 font-semibold">
                 {mode === "create" ? "Create question" : "Save question"}
               </Button>
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => {
                   if (backUrl) {
                     router.push(backUrl);
                   } else if (classroomId) {
                     router.push(`/classrooms/${classroomId}`);
                   } else {
                     router.push("/classrooms");
                   }
                 }}
                 className="rounded-full h-9 font-semibold"
               >
                 Cancel
               </Button>
             </div>
          </form>
        </CardContent>
      </Card>

      {isClassroomCreate ? (
        <Card className="rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-card text-card-foreground shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Testcases</CardTitle>
              <CardDescription>Add the visible and hidden checks used when this question is assigned.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className={uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleTxtUpload}
                />
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : "Upload .txt"}
                </span>
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={addCreateTestcase}>
                <Plus className="h-4 w-4" />
                Add testcase
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {createTestcases.map((testcase, index) => (
              <div key={testcase.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    Testcase {index + 1}
                    {testcase.isSample ? (
                      <Badge variant="secondary" className="ml-2">
                        Sample
                      </Badge>
                    ) : null}
                    {!testcase.isHidden ? (
                      <Badge variant="default" className="ml-2">
                        Visible
                      </Badge>
                    ) : null}
                  </p>
                  {createTestcases.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeCreateTestcase(testcase.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Input
                    </Label>
                    <Textarea
                      rows={3}
                      value={testcase.input}
                      onChange={(event) =>
                        updateCreateTestcase(testcase.id, "input", event.target.value)
                      }
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
                      value={testcase.expectedOutput}
                      onChange={(event) =>
                        updateCreateTestcase(testcase.id, "expectedOutput", event.target.value)
                      }
                      placeholder="expected stdout"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={testcase.isSample}
                      onCheckedChange={(checked) =>
                        updateCreateTestcase(testcase.id, "isSample", checked)
                      }
                      id={`create-sample-${testcase.id}`}
                    />
                    <Label htmlFor={`create-sample-${testcase.id}`} className="cursor-pointer text-sm">
                      Sample (visible to students)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!testcase.isHidden}
                      onCheckedChange={(checked) =>
                        updateCreateTestcase(testcase.id, "isHidden", !checked)
                      }
                      id={`create-hidden-${testcase.id}`}
                    />
                    <Label htmlFor={`create-hidden-${testcase.id}`} className="cursor-pointer text-sm">
                      Show output to students
                    </Label>
                  </div>
                  <Input
                    className="w-40"
                    placeholder="Name (optional)"
                    value={testcase.name}
                    onChange={(event) =>
                      updateCreateTestcase(testcase.id, "name", event.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {question ? (
        <Card className="rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-card text-card-foreground shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Testcases</CardTitle>
              <CardDescription>Students can only inspect sample cases.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* .txt bulk upload */}
              <label className={uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleTxtUpload}
                />
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : "Upload .txt"}
                </span>
              </label>
              <TestcaseDialog questionId={question.id} triggerLabel="Add testcase" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Hidden</TableHead>
                  <TableHead>Checker</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {question.testcases.map((testcase) => (
                  <TableRow key={testcase.id}>
                    <TableCell>{testcase.name ?? "Unnamed testcase"}</TableCell>
                    <TableCell>
                      <Badge variant={testcase.isSample ? "default" : "outline"}>
                        {testcase.isSample ? "sample" : "official"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={testcase.isHidden ? "secondary" : "outline"}>
                        {testcase.isHidden ? "hidden" : "visible"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="default">{testcase.checkerType}</Badge>
                        {testcase.floatTolerance ? (
                          <span className="text-xs text-slate-500">tol {testcase.floatTolerance}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{testcase.sortOrder}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <TestcaseDialog questionId={question.id} testcase={testcase} triggerLabel="Edit" />
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteTestcase(testcase.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
