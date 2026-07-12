"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Edit, Plus, Trash2, Upload } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { TestcaseDialog } from "@/modules/questions/components/testcase-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_DIFFICULTIES } from "@/modules/questions/constants";
import { Messages } from "@/lib/api.constants";

type CreateTestcase = {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
};

type PersistedTestcase = {
  id: string;
  name: string | null;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
  checkerType: string;
  floatTolerance: string | null;
  sortOrder: number;
};

const questionActionButtonClass = "h-10 rounded-full px-5 font-semibold";

function FileUploadTrigger({
  accept,
  disabled,
  label,
  multiple = false,
  onChange,
}: {
  accept: string;
  disabled: boolean;
  label: string;
  multiple?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className={`${questionActionButtonClass} border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-200 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:hover:text-slate-900`}
    >
      <label
        aria-disabled={disabled}
        className={disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
      >
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={onChange}
        />
        <Upload className="h-4 w-4" />
        {label}
      </label>
    </Button>
  );
}

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
  workspaceId,
  backUrl,
}: {
  mode: "create" | "edit";
  languages?: Array<{ id: string; slug: string; name: string }>;
  workspaceId: string;
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
    testcases: PersistedTestcase[];
  };
}) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? "easy");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingMd, setUploadingMd] = useState(false);
  const [createTestcases, setCreateTestcases] = useState<CreateTestcase[]>([newCreateTestcase()]);
  const [description, setDescription] = useState(question?.description ?? "");

  // Derive initial allowed languages: empty array means "all languages"
  const [allowedLangs, setAllowedLangs] = useState<string[]>(
    question?.allowedLanguages ?? [],
  );
  const isWorkspaceCreate = mode === "create";

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

  async function handleMdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length !== 1) {
      toast.error("Please select exactly one .md file.");
      e.target.value = "";
      return;
    }
    const file = files[0];
    const isMarkdown =
      file.name.toLowerCase().endsWith(".md") || file.type === "text/markdown";
    if (!isMarkdown) {
      toast.error("Only .md files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("File too large (max 1 MB).");
      e.target.value = "";
      return;
    }
    setUploadingMd(true);
    try {
      const content = await file.text();
      setDescription(content);
      toast.success("Description imported.");
    } catch {
      toast.error(Messages.somethingWrong);
    } finally {
      setUploadingMd(false);
      e.target.value = "";
    }
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

    if (isWorkspaceCreate) {
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
      const res = await fetch(`/api/workspaces/${workspaceId}/questions/${question.id}/testcases`, {
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

    const endpoint = mode === "create"
      ? `/api/workspaces/${workspaceId}/questions`
      : `/api/workspaces/${workspaceId}/questions/${question?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const finalPayload =
      isWorkspaceCreate
        ? {
            ...payload,
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
      toast.error(data.message ?? Messages.unableToSaveQuestion);
      setPending(false);
      return;
    }

    toast.success(mode === "create" ? "Question created." : "Question updated.");
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.push(`/workspaces/${workspaceId}`);
    }
    router.refresh();
  }

  async function handleDeleteTestcase(testcaseId: string) {
    const response = await fetch(`/api/workspaces/${workspaceId}/questions/${question?.id}/testcases/${testcaseId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error(Messages.unableToDeleteTestcase);
      return;
    }

    toast.success("Testcase deleted.");
    window.location.reload();
  }

  const testcaseColumns: DataTableColumn<PersistedTestcase>[] = [
    { id: "name", header: "Name", cell: (testcase) => testcase.name ?? "Unnamed testcase" },
    {
      id: "sample",
      header: "Sample",
      cell: (testcase) => <Badge variant={testcase.isSample ? "default" : "outline"}>{testcase.isSample ? "sample" : "official"}</Badge>,
    },
    {
      id: "visibility",
      header: "Hidden",
      cell: (testcase) => <Badge variant={testcase.isHidden ? "secondary" : "outline"}>{testcase.isHidden ? "hidden" : "visible"}</Badge>,
    },
    {
      id: "checker",
      header: "Checker",
      cell: (testcase) => (
        <div className="flex flex-col gap-1">
          <Badge variant="default">{testcase.checkerType}</Badge>
          {testcase.floatTolerance ? <span className="text-xs text-slate-500">tol {testcase.floatTolerance}</span> : null}
        </div>
      ),
    },
    { id: "sort", header: "Sort", cell: (testcase) => testcase.sortOrder },
    {
      id: "actions",
      header: "",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (testcase) => question ? (
        <div className="flex items-center justify-end gap-1.5">
          <TestcaseDialog
            workspaceId={workspaceId}
            questionId={question.id}
            testcase={testcase}
            triggerLabel="Edit"
            trigger={
              <button type="button" title="Edit testcase" className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <Edit className="h-4 w-4" />
              </button>
            }
          />
          <button
            type="button"
            title="Delete testcase"
            onClick={() => void handleDeleteTestcase(testcase.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null,
    },
  ];

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
            <FormField label="Title" htmlFor="title" required>
              <Input id="title" name="title" defaultValue={question?.title ?? ""} required />
            </FormField>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Description <span className="ml-0.5 text-red-500">*</span></label>
                <FileUploadTrigger
                  accept=".md,text/markdown"
                  disabled={uploadingMd}
                  label={uploadingMd ? "Importing…" : "Upload .md"}
                  onChange={handleMdUpload}
                />
              </div>
              <MarkdownEditor
                name="description"
                value={description}
                onChange={setDescription}
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
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Published</p>
                <p className="text-xs text-slate-500">Only published questions are visible to students.</p>
              </div>
              <Switch name="isPublished" defaultChecked={question?.isPublished ?? false} />
            </div>
             <div className="flex items-center gap-3">
               <Button type="submit" disabled={pending} className={questionActionButtonClass}>
                 {mode === "create" ? "Create question" : "Save question"}
               </Button>
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => {
                   if (backUrl) {
                     router.push(backUrl);
                   } else if (workspaceId) {
                     router.push(`/workspaces/${workspaceId}`);
                   } else {
                     router.push("/workspaces");
                   }
                 }}
                 className={questionActionButtonClass}
               >
                 Cancel
               </Button>
             </div>
          </form>
        </CardContent>
      </Card>

      {isWorkspaceCreate ? (
        <Card className="rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-card text-card-foreground shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Testcases</CardTitle>
              <CardDescription>Add the visible and hidden checks used to grade this question.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <FileUploadTrigger
                accept=".txt"
                disabled={uploading}
                label={uploading ? "Uploading…" : "Upload .txt"}
                multiple
                onChange={handleTxtUpload}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addCreateTestcase}
                className={questionActionButtonClass}
              >
                <Plus className="h-4 w-4" />
                Add testcase
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {createTestcases.map((testcase, index) => (
              <div key={testcase.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-700">
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
                  </div>
                  {createTestcases.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeCreateTestcase(testcase.id)}
                      title="Delete testcase"
                      className="inline-flex items-center justify-center h-8 w-8 rounded text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
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
        <DataTable
          title="Testcases"
          rows={question.testcases}
          columns={testcaseColumns}
          getRowKey={(testcase) => testcase.id}
          emptyMessage="No testcases yet."
          actions={
            <>
              <FileUploadTrigger
                accept=".txt"
                disabled={uploading}
                label={uploading ? "Uploading…" : "Upload .txt"}
                multiple
                onChange={handleTxtUpload}
              />
              <TestcaseDialog workspaceId={workspaceId} questionId={question.id} triggerLabel="Add testcase" />
            </>
          }
        />
      ) : null}
    </div>
  );
}
