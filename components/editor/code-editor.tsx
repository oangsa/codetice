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
import { IDEMPOTENCY_KEY_HEADER, PYTHON_COMPLETIONS } from "@/lib/constants";
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

function resolveMonacoLanguage(language: string) {
  const normalized = language.trim().toLowerCase();

  if (["c", "cc", "c++", "cplusplus"].includes(normalized)) {
    return "cpp";
  }

  return normalized || "plaintext";
}

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
  languages: Array<{ slug: string; name: string; editorLanguage: string }>;
  assignmentId?: string | null;
}) {
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setTheme(
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light"
      );
    };

    const animationFrame = window.requestAnimationFrame(() => {
      updateTheme();
      setMounted(true);
    });

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.slug ?? "python");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() => {
    const initialLanguage = languages[0]?.slug ?? "python";
    return {
      [initialLanguage]: starterCodeByLanguage[initialLanguage] || starterCode,
    };
  });
  const [pendingAction, setPendingAction] = useState<"submit" | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [submissionSummary, setSubmissionSummary] = useState<{
    status: string;
    isLate: boolean;
    score: string;
    passedCount: number;
    totalCount: number;
    errorMessage?: string | null;
  } | null>(null);
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const diagnosticsAbortRef = useRef<AbortController | null>(null);
  const submitIdempotencyKeyRef = useRef<string | null>(null);
  const editorLanguage = resolveMonacoLanguage(
    languages.find((language) => language.slug === selectedLanguage)?.editorLanguage ?? "plaintext",
  );
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
    if (pendingAction !== null || submitIdempotencyKeyRef.current) {
      return;
    }

    setPendingAction("submit");
    submitIdempotencyKeyRef.current = crypto.randomUUID();

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [IDEMPOTENCY_KEY_HEADER]: submitIdempotencyKeyRef.current,
        },
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
        return;
      }

      setSubmissionSummary(null);
      setActiveSubmissionId(payload.submission?.id ?? null);
      toast.message("Solution submitted", {
        description: "Grading is running. Final result will appear here when processing finishes.",
      });
    } finally {
      submitIdempotencyKeyRef.current = null;
      setPendingAction(null);
    }
  }

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorLanguage !== "python") {
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
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [code, editorLanguage]);

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
        errorMessage: submission.errorMessage,
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

    monaco.editor.defineTheme("codetice-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d0e12",
        "editorGutter.background": "#0d0e12",
        "editorLineNumber.foreground": "#6b7280",
        "editor.lineHighlightBackground": "#13151b",
        "editorCursor.foreground": "#ffffff",
      },
    });

    // Explicitly apply the correct theme after defining it to ensure it takes effect
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    monaco.editor.setTheme(currentTheme === "dark" ? "codetice-dark" : "vs");

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
    <div className="h-full flex flex-col">
      <Card className="rounded-[30px] border shadow-sm h-full flex flex-col">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-2 shrink-0">
          <div className="pl-2 pt-[9px]">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Solution editor</CardTitle>
          </div>
          <div className="flex flex-nowrap items-center gap-2">
            <div className="w-44">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="rounded-full">
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
              className="rounded-full"
              disabled={pendingAction !== null}
              onClick={() => void submitSolution()}
            >
              {pendingAction === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2 flex-1 flex flex-col min-h-0">
          {submissionSummary ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 pl-2 mb-3 shrink-0">
              <span>Latest submission:</span>
              <SubmissionStatusBadge status={submissionSummary.status} isLate={submissionSummary.isLate} />
              <span>{`${submissionSummary.passedCount}/${submissionSummary.totalCount} tests · ${submissionSummary.score} points`}</span>
            </div>
          ) : null}
          {submissionSummary?.errorMessage ? (
            <pre className="rounded-[16px] bg-slate-100 dark:bg-slate-900 px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono mb-3 shrink-0 max-h-40 overflow-y-auto">
              {submissionSummary.errorMessage}
            </pre>
          ) : null}
          <div className="overflow-hidden rounded-[22px] border border-slate-200 flex-1 min-h-0">
            {mounted ? (
              <Editor
                height="100%"
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
                theme={theme === "dark" ? "codetice-dark" : "vs"}
              />
            ) : (
              <div className="h-full bg-white dark:bg-[#0d0e12] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
