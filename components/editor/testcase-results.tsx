import { CheckCircle2, XCircle } from "lucide-react";

import { SubmissionStatusBadge } from "@/components/submissions/submission-status-badge";
import { formatSubmissionStatusLabel } from "@/lib/submission-feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";

export function TestcaseResults({
  results,
}: {
  results: Array<{
    testcaseId: string;
    name: string | null;
    passed: boolean;
    status: string;
    runtimeMs: number | null;
    actualOutput: string | null;
    expectedOutput: string | null;
    errorMessage: string | null;
    isHidden: boolean;
  }>;
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        title="No testcase results yet"
        description="Run sample tests to see visible testcase output and diagnostics."
      />
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Card key={result.testcaseId}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold">
              {result.name ?? result.testcaseId}
            </CardTitle>
            <div className="flex items-center gap-2">
              <SubmissionStatusBadge status={result.status} />
              {result.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Expected</p>
                <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-800">{result.expectedOutput ?? "Hidden"}</pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Actual</p>
                <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-800">{result.actualOutput ?? "Hidden"}</pre>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Runtime: {result.runtimeMs ?? 0} ms</span>
              <span>{result.passed ? "Passed" : formatSubmissionStatusLabel(result.status)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
