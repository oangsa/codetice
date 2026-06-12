"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SubmissionStatusBadge } from "@/components/submissions/submission-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PYTHON_COMPLETIONS } from "@/lib/constants";
import { formatSubmissionFeedback, formatSubmissionStatusLabel } from "@/lib/submission-feedback";

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
  const [pendingAction, setPendingAction] = useState<"submit" | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [submissionSummary, setSubmissionSummary] = useState<{
    status: string;
    isLate: boolean;
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

  async function submitSolution() {
    setPendingAction("submit");

    const response = await fetch("/api/submit", {
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

    setSubmissionSummary(null);
    setActiveSubmissionId(payload.submission?.id ?? null);
    toast.message("Solution submitted", {
      description: "Grading is running. Final result will appear here when processing finishes.",
    });

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
          isLate: boolean;
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

      setSubmissionSummary({
        status: submission.status,
        isLate: submission.isLate,
        score: submission.score,
        passedCount: submission.passedCount,
        totalCount: submission.totalCount,
      });

      if (!["queued", "running"].includes(submission.status)) {
        if (submission.status === "accepted") {
          toast.success("Accepted", {
            description: `Passed ${submission.passedCount}/${submission.totalCount} tests. Score ${submission.score}.`,
          });
        } else {
          toast.error(formatSubmissionStatusLabel(submission.status), {
            description: formatSubmissionFeedback(
              submission.status,
              submission.passedCount,
              submission.totalCount,
              submission.score,
            ),
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
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>Latest submission:</span>
                <SubmissionStatusBadge status={submissionSummary.status} isLate={submissionSummary.isLate} />
                <span>
                  {`${submissionSummary.passedCount}/${submissionSummary.totalCount} tests · ${submissionSummary.score} points`}
                </span>
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
              disabled={pendingAction !== null}
              onClick={() => void submitSolution()}
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
              height="620px"
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
    </div>
  );
}
