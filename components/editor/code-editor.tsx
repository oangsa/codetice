"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as monacoEditor from "monaco-editor";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SubmissionStatusBadge } from "@/components/submissions/submission-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IDEMPOTENCY_KEY_HEADER, Messages } from "@/lib/api.constants";
import { createEditorDraftStorageKey, readEditorDraft, writeEditorDraft } from "@/lib/editor-drafts";
import { formatSubmissionFeedback, formatSubmissionStatusLabel } from "@/lib/submission-feedback";
import { MonacoCodeEditor, resolveMonacoLanguage } from "@/components/editor/monaco-code-editor";

const EDITOR_MARKER_OWNER = "language-diagnostics";

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
  languages: Array<{ slug: string; name: string; editorLanguage: string; defaultStarterCode: string | null }>;
  assignmentId?: string | null;
}) {
  const router = useRouter();
  const draftStorageKey = useMemo(
    () => createEditorDraftStorageKey(questionId, assignmentId),
    [questionId, assignmentId],
  );

  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.slug ?? "python");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() => {
    const initialLanguage = languages[0]?.slug ?? "python";
    const languageDefault = languages.find((language) => language.slug === initialLanguage)?.defaultStarterCode ?? "";
    const draft = readEditorDraft(draftStorageKey);

    return {
      [initialLanguage]: starterCodeByLanguage[initialLanguage] ?? (starterCode || languageDefault),
      ...(draft ?? {}),
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
  const languageDefault = languages.find((language) => language.slug === selectedLanguage)?.defaultStarterCode ?? "";
  const code = codeByLanguage[selectedLanguage] ?? starterCodeByLanguage[selectedLanguage] ?? (starterCode || languageDefault);

  const monacoOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "Agave, 'Agave Nerd Font', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
      automaticLayout: true,
      roundedSelection: false,
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
    }),
    [],
  );

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    void import("monaco-editor").then((monaco) => {
      const model = editorRef.current?.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, editorLanguage);
      }
    });
  }, [editorLanguage]);

  async function submitSolution() {
    if (pendingAction !== null || submitIdempotencyKeyRef.current) {
      return;
    }

    if (!code.trim()) {
      toast.error(Messages.codeRequired);
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
        toast.error(payload.message ?? Messages.somethingWrong);
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

    diagnosticsAbortRef.current?.abort();
    const controller = new AbortController();
    diagnosticsAbortRef.current = controller;

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch("/api/languages/diagnostics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCode: code, language: selectedLanguage }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const monaco = await import("monaco-editor");
          const model = editorRef.current?.getModel();
          if (model) {
            monaco.editor.setModelMarkers(model, EDITOR_MARKER_OWNER, []);
          }
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
            EDITOR_MARKER_OWNER,
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

  function handleMount(editor: monacoEditor.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <Card className="rounded-[30px] border shadow-sm h-full min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-2 shrink-0">
          <div className="pl-2 pt-[9px]">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Editor</CardTitle>
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
            <pre className="rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 text-xs font-mono mb-3 shrink-0 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {submissionSummary.errorMessage}
            </pre>
          ) : null}
          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white flex-1 min-h-0 dark:border-white/10 dark:bg-[#0d0e12]">
            <MonacoCodeEditor
              height="100%"
              language={editorLanguage}
              value={code}
              onChange={(value) => {
                setCodeByLanguage((current) => {
                  const next = {
                    ...current,
                    [selectedLanguage]: value ?? "",
                  };
                  writeEditorDraft(draftStorageKey, next);
                  return next;
                });
              }}
              onMount={handleMount}
              options={monacoOptions}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
