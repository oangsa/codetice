"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Upload } from "lucide-react";

import { TestcaseDialog } from "@/components/questions/testcase-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_DIFFICULTIES } from "@/lib/constants";

export function QuestionForm({
  mode,
  question,
}: {
  mode: "create" | "edit";
  question?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    totalScore: string;
    timeLimitMs: number;
    memoryLimitMb: number;
    starterCode: string | null;
    starterCodeByLanguage: Record<string, string>;
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

  async function handleTxtUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !question?.id) return;
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
      slug: String(formData.get("slug") ?? ""),
      description: String(formData.get("description") ?? ""),
      difficulty,
      totalScore: Number(formData.get("totalScore") ?? 100),
      timeLimitMs: Number(formData.get("timeLimitMs") ?? 2000),
      memoryLimitMb: Number(formData.get("memoryLimitMb") ?? 128),
      starterCode: String(formData.get("starterCode") ?? ""),
      starterCodeByLanguage: {
        python: String(formData.get("starterCodePython") ?? ""),
        javascript: String(formData.get("starterCodeJavascript") ?? ""),
        typescript: String(formData.get("starterCodeTypescript") ?? ""),
      },
      isPublished: formData.get("isPublished") === "on",
    };

    const endpoint = mode === "create" ? "/api/questions" : `/api/questions/${question?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { message?: string; question?: { id: string } };

    if (!response.ok) {
      toast.error(data.message ?? "Unable to save question.");
      setPending(false);
      return;
    }

    toast.success(mode === "create" ? "Question created." : "Question updated.");
    router.push(mode === "create" ? `/admin/questions/${data.question?.id}/edit` : "/admin/questions");
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
      <Card>
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
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Title" htmlFor="title">
                <Input id="title" name="title" defaultValue={question?.title ?? ""} required />
              </FormField>
              <FormField label="Slug" htmlFor="slug">
                <Input id="slug" name="slug" defaultValue={question?.slug ?? ""} required />
              </FormField>
            </div>
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
                  <SelectTrigger id="difficulty">
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
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Python starter" htmlFor="starterCodePython">
                <Textarea
                  id="starterCodePython"
                  name="starterCodePython"
                  defaultValue={question?.starterCodeByLanguage?.python ?? ""}
                />
              </FormField>
              <FormField label="JavaScript starter" htmlFor="starterCodeJavascript">
                <Textarea
                  id="starterCodeJavascript"
                  name="starterCodeJavascript"
                  defaultValue={question?.starterCodeByLanguage?.javascript ?? ""}
                />
              </FormField>
              <FormField label="TypeScript starter" htmlFor="starterCodeTypescript">
                <Textarea
                  id="starterCodeTypescript"
                  name="starterCodeTypescript"
                  defaultValue={question?.starterCodeByLanguage?.typescript ?? ""}
                />
              </FormField>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Published</p>
                <p className="text-xs text-slate-500">Only published questions are visible to students.</p>
              </div>
              <Switch name="isPublished" defaultChecked={question?.isPublished ?? false} />
            </div>
            <Button type="submit" disabled={pending}>
              {mode === "create" ? "Create question" : "Save question"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {question ? (
        <Card>
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
                      <Badge variant={testcase.isSample ? "success" : "default"}>
                        {testcase.isSample ? "sample" : "official"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={testcase.isHidden ? "warning" : "info"}>
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
