"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { Loader2, Play, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OutputPanel } from "@/components/editor/output-panel";
import { TestcaseResults } from "@/components/editor/testcase-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PYTHON_COMPLETIONS } from "@/lib/constants";

type ResultRow = {
  testcaseId: string;
  name: string | null;
  passed: boolean;
  status: string;
  runtimeMs: number | null;
  actualOutput: string | null;
  expectedOutput: string | null;
  errorMessage: string | null;
  isHidden: boolean;
};

export function CodeEditor({
  questionId,
  starterCode,
  starterCodeByLanguage,
  languages,
  assignmentId,
}: {
  questionId: string;
  starterCode: string;
  starterCodeByLanguage: Record<string, string>;
  languages: Array<{ slug: string; name: string }>;
  assignmentId?: string | null;
}) {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.slug ?? "python");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() => {
    const initialLanguage = languages[0]?.slug ?? "python";
    return {
      [initialLanguage]: starterCodeByLanguage[initialLanguage] || starterCode,
    };
  });
  const [pendingAction, setPendingAction] = useState<"run" | "submit" | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [editorOutput, setEditorOutput] = useState("");
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [submissionSummary, setSubmissionSummary] = useState<{
    status: string;
    score: string;
    passedCount: number;
    totalCount: number;
  } | null>(null);
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const diagnosticsAbortRef = useRef<AbortController | null>(null);
  const editorLanguage =
    selectedLanguage === "javascript" ? "javascript" : selectedLanguage === "typescript" ? "typescript" : "python";
  const code = codeByLanguage[selectedLanguage] ?? starterCodeByLanguage[selectedLanguage] ?? starterCode;

  const monacoOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 14,
      automaticLayout: true,
      roundedSelection: false,
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
    }),
    [],
  );

  async function runRequest(kind: "run" | "submit") {
    setPendingAction(kind);
    const endpoint = kind === "run" ? "/api/run-sample" : "/api/submit";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId,
        sourceCode: code,
        language: selectedLanguage,
        assignmentId,
      }),
    });

    const payload = (await response.json()) as {
      message?: string;
      results?: ResultRow[];
      submission?: { id: string };
      status?: string;
      errorMessage?: string | null;
      passedCount?: number;
      totalCount?: number;
      score?: string;
      runtimeMs?: number | null;
    };

    if (!response.ok) {
      toast.error(payload.message ?? "Request failed.");
      setPendingAction(null);
      return;
    }

    if (kind === "run") {
      setResults(payload.results ?? []);
      setSubmissionSummary(null);
      setConsoleOutput(
        (payload.results ?? [])
          .map((result) => `${result.name ?? result.testcaseId}: ${result.status}`)
          .join("\n"),
      );
      setEditorOutput((payload.results ?? []).map((result) => result.actualOutput ?? "").join("\n---\n"));
      toast.success("Sample tests complete.");
    } else {
      setSubmissionSummary(null);
      setActiveSubmissionId(payload.submission?.id ?? null);
      setConsoleOutput(`Submission ${payload.status}\nQueued for grading.`);
      setEditorOutput(payload.errorMessage ?? "Submission recorded and queued.");
      toast.message("Solution submitted", {
        description: "Grading is running. Final result will appear here when processing finishes.",
      });
    }

    setPendingAction(null);
  }

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (selectedLanguage !== "python") {
      diagnosticsAbortRef.current?.abort();
      void import("monaco-editor").then((monaco) => {
        const model = editorRef.current?.getModel();
        if (model) {
          monaco.editor.setModelMarkers(model, "pyright", []);
        }
      });
      return;
    }

    diagnosticsAbortRef.current?.abort();
    const controller = new AbortController();
    diagnosticsAbortRef.current = controller;

    const timeout = setTimeout(async () => {
      setDiagnosticsLoading(true);
      try {
        const response = await fetch("/api/python/diagnostics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCode: code }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          diagnostics: Array<{
            message: string;
            line: number;
            column: number;
            endLine: number;
            endColumn: number;
            severity: "error" | "warning" | "information";
          }>;
        };

        const monaco = await import("monaco-editor");
        const model = editorRef.current?.getModel();
        if (model) {
          monaco.editor.setModelMarkers(
            model,
            "pyright",
            payload.diagnostics.map((diagnostic) => ({
              message: diagnostic.message,
              startLineNumber: diagnostic.line,
              startColumn: diagnostic.column,
              endLineNumber: diagnostic.endLine,
              endColumn: diagnostic.endColumn,
              severity:
                diagnostic.severity === "warning"
                  ? monaco.MarkerSeverity.Warning
                  : diagnostic.severity === "information"
                    ? monaco.MarkerSeverity.Info
                    : monaco.MarkerSeverity.Error,
            })),
          );
        }
      } catch {
        // Ignore transient diagnostics failures in the editor.
      } finally {
        setDiagnosticsLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [code, selectedLanguage]);

  useEffect(() => {
    if (!activeSubmissionId) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/submissions/${activeSubmissionId}`);
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        submission: {
          id: string;
          status: string;
          score: string;
          passedCount: number;
          totalCount: number;
          errorMessage: string | null;
          testcaseResults: ResultRow[];
        };
      };

      const submission = payload.submission;
      if (!submission) {
        return;
      }

      setResults(submission.testcaseResults ?? []);
      setSubmissionSummary({
        status: submission.status,
        score: submission.score,
        passedCount: submission.passedCount,
        totalCount: submission.totalCount,
      });
      setConsoleOutput(
        `Submission ${submission.status}\nPassed ${submission.passedCount}/${submission.totalCount}\nScore ${submission.score}`,
      );
      setEditorOutput(submission.errorMessage ?? "Submission processed.");

      if (!["queued", "running"].includes(submission.status)) {
        if (submission.status === "accepted") {
          toast.success("Accepted", {
            description: `Passed ${submission.passedCount}/${submission.totalCount} tests. Score ${submission.score}.`,
          });
        } else {
          toast.error(submission.status.replaceAll("_", " "), {
            description:
              submission.errorMessage ??
              `Passed ${submission.passedCount}/${submission.totalCount} tests. Score ${submission.score}.`,
          });
        }
        router.refresh();
        window.clearInterval(interval);
        setActiveSubmissionId(null);
      }
    }, 1500);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeSubmissionId, router]);

  function handleMount(editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = editor;

    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: () => ({
        suggestions: PYTHON_COMPLETIONS.map((item) => ({
          label: item,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: item,
        })),
      }),
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-4 xl:flex-row xl:items-center xl:justify-between xl:space-y-0">
          <div>
            <CardTitle className="text-base">Solution editor</CardTitle>
            <p className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">
              {languages.find((language) => language.slug === selectedLanguage)?.name ?? "Editor"} runtime
            </p>
            {submissionSummary ? (
              <p className="mt-2 text-sm text-slate-600">
                Latest submission:{" "}
                <span className="font-medium text-slate-900">
                  {submissionSummary.status.replaceAll("_", " ")}
                </span>
                {` · ${submissionSummary.passedCount}/${submissionSummary.totalCount} tests · ${submissionSummary.score} points`}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.slug} value={language.slug}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={pendingAction !== null}
              onClick={() => void runRequest("run")}
            >
              {pendingAction === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run sample
            </Button>
            <Button
              type="button"
              disabled={pendingAction !== null}
              onClick={() => void runRequest("submit")}
            >
              {pendingAction === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Judge output normalization enabled</span>
            <span>
              {selectedLanguage === "python"
                ? diagnosticsLoading
                  ? "Running Pyright diagnostics..."
                  : "Pyright diagnostics ready"
                : "Diagnostics available for Python"}
            </span>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <Editor
              height="480px"
              language={editorLanguage}
              value={code}
              onChange={(value) =>
                setCodeByLanguage((current) => ({
                  ...current,
                  [selectedLanguage]: value ?? "",
                }))
              }
              onMount={handleMount}
              options={monacoOptions}
              theme="vs"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="output">
        <TabsList>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
        </TabsList>
        <TabsContent value="output">
          <OutputPanel title="Program output" value={editorOutput} />
        </TabsContent>
        <TabsContent value="results">
          <TestcaseResults results={results} />
        </TabsContent>
        <TabsContent value="console">
          <OutputPanel title="Console" value={consoleOutput} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
