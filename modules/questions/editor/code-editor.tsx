"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as monacoEditor from "monaco-editor";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SubmissionStatusBadge } from "@/modules/submissions/components/submission-status-badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IDEMPOTENCY_KEY_HEADER, Messages } from "@/lib/api.constants";
import { createEditorDraftStorageKey, readEditorDraft, writeEditorDraft } from "@/modules/questions/editor-drafts";
import { formatSubmissionFeedback, formatSubmissionStatusLabel } from "@/modules/submissions/feedback";
import { MonacoCodeEditor, resolveMonacoLanguage } from "@/modules/questions/editor/monaco-code-editor";

const EDITOR_MARKER_OWNER = "language-diagnostics";

type EditorDiagnostic = {
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: "error" | "warning" | "information";
};

type SandboxJobPayload = {
  job: {
    id: string;
    status: string;
    errorMessage: string | null;
    result: null | {
      diagnostics?: EditorDiagnostic[];
    };
  };
};

function waitForPoll(signal: AbortSignal, delayMs = 750) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function pollSandboxJob(workspaceId: string, jobId: string, signal: AbortSignal) {
  while (!signal.aborted) {
    await waitForPoll(signal);
    const response = await fetch(`/api/workspaces/${workspaceId}/sandbox-jobs/${jobId}`, { signal });
    if (!response.ok) throw new Error("Unable to load sandbox result.");
    const payload = await response.json() as SandboxJobPayload;
    if (!["queued", "running"].includes(payload.job.status)) return payload.job;
  }
  throw new DOMException("Aborted", "AbortError");
}

export function CodeEditor({
  workspaceId,
  questionId,
  starterCode,
  starterCodeByLanguage,
  languages,
}: {
  workspaceId: string;
  questionId: string;
  starterCode: string;
  starterCodeByLanguage: Record<string, string>;
  languages: Array<{ slug: string; name: string; editorLanguage: string; defaultStarterCode: string | null }>;
}) {
  const router = useRouter();
  const draftStorageKey = useMemo(() => createEditorDraftStorageKey(questionId), [questionId]);

  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.slug ?? "");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() => {
    const initialLanguage = languages[0]?.slug ?? "";
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

  useEffect(() => {
    if (!editorRef.current || !selectedLanguage) return;

    diagnosticsAbortRef.current?.abort();
    const controller = new AbortController();
    diagnosticsAbortRef.current = controller;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/diagnostics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, sourceCode: code, language: selectedLanguage }),
          signal: controller.signal,
        });
        const monaco = await import("monaco-editor");
        const model = editorRef.current?.getModel();
        if (!model) return;
        if (!response.ok) {
          monaco.editor.setModelMarkers(model, EDITOR_MARKER_OWNER, []);
          return;
        }
        const payload = (await response.json()) as { diagnostics?: EditorDiagnostic[]; job?: { id: string } };
        const diagnostics = response.status === 202 && payload.job
          ? (await pollSandboxJob(workspaceId, payload.job.id, controller.signal)).result?.diagnostics ?? []
          : payload.diagnostics ?? [];
        monaco.editor.setModelMarkers(model, EDITOR_MARKER_OWNER, diagnostics.map((diagnostic) => ({
          message: diagnostic.message,
          startLineNumber: diagnostic.line,
          startColumn: diagnostic.column,
          endLineNumber: diagnostic.endLine,
          endColumn: diagnostic.endColumn,
          severity: diagnostic.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : diagnostic.severity === "information"
              ? monaco.MarkerSeverity.Info
              : monaco.MarkerSeverity.Error,
        })));
      } catch {
        // Diagnostics are advisory; transient failures must not interrupt editing.
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [code, questionId, selectedLanguage, workspaceId]);

  async function submitSolution() {
    if (pendingAction !== null || submitIdempotencyKeyRef.current) {
      return;
    }

    if (!selectedLanguage) {
      toast.error("No enabled language is available for this question.");
      return;
    }
    if (!code.trim()) {
      toast.error(Messages.codeRequired);
      return;
    }

    setPendingAction("submit");
    submitIdempotencyKeyRef.current = crypto.randomUUID();

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [IDEMPOTENCY_KEY_HEADER]: submitIdempotencyKeyRef.current,
        },
        body: JSON.stringify({
          questionId,
          sourceCode: code,
          language: selectedLanguage,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
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
    if (!activeSubmissionId) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/submissions/${activeSubmissionId}`);
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        submission: {
          id: string;
          latestRun: { status: string; passedCount: number; totalCount: number; score: string; errorMessage: string | null };
          effectiveScore: string | null;
        };
      };

      const submission = payload.submission;
      if (!submission) {
        return;
      }

      setSubmissionSummary({
        status: submission.latestRun.status,
        score: submission.effectiveScore ?? submission.latestRun.score,
        passedCount: submission.latestRun.passedCount,
        totalCount: submission.latestRun.totalCount,
        errorMessage: submission.latestRun.errorMessage,
      });

      if (!["queued", "running"].includes(submission.latestRun.status)) {
        if (submission.latestRun.status === "accepted") {
          toast.success("Accepted", {
            description: `Passed ${submission.latestRun.passedCount}/${submission.latestRun.totalCount} tests. Score ${submission.effectiveScore ?? submission.latestRun.score}.`,
          });
        } else {
          toast.error(formatSubmissionStatusLabel(submission.latestRun.status), {
            description: formatSubmissionFeedback(
              submission.latestRun.status,
              submission.latestRun.passedCount,
              submission.latestRun.totalCount,
              submission.effectiveScore ?? submission.latestRun.score,
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
  }, [activeSubmissionId, workspaceId, router]);

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
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={languages.length === 0}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="No language available" />
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
              disabled={pendingAction !== null || languages.length === 0}
              onClick={() => void submitSolution()}
            >
              {pendingAction === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2 flex-1 flex flex-col min-h-0">
          {languages.length === 0 ? (
            <p className="mb-3 shrink-0 pl-2 text-sm text-amber-600 dark:text-amber-400">
              No enabled language is available for this question. Ask workspace staff to update its accepted languages.
            </p>
          ) : null}
          {submissionSummary ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 pl-2 mb-3 shrink-0">
              <span>Latest submission:</span>
              <SubmissionStatusBadge status={submissionSummary.status} />
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
