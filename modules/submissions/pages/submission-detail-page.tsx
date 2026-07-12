import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { DataTable, DataTablePagination, type DataTableColumn } from "@/components/common/data-table";
import { ReviseSubmissionButton } from "@/modules/submissions/components/revise-submission-button";
import { SubmissionCodeViewer } from "@/modules/submissions/components/submission-code-viewer";
import { SubmissionStatusBadge } from "@/modules/submissions/components/submission-status-badge";
import { WorkspaceRejudgeButton } from "@/modules/submissions/components/workspace-rejudge-button";
import { Badge } from "@/components/ui/badge";
import { requirePageUser } from "@/lib/auth";
import { formatDate, formatScore } from "@/lib/utils";
import { getWorkspaceSubmissionDetail, listRunResultsPage, listSubmissionRunsPage } from "@/server/submissions/queries";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { getWorkspaceDetail } from "@/server/workspaces/queries";

export default async function WorkspaceSubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; submissionId: string }>;
  searchParams: Promise<{ runId?: string; runCursor?: string; resultCursor?: string }>;
}) {
  const actor = await requirePageUser();
  const { id, submissionId } = await params;
  const query = await searchParams;
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.member) notFound();

  const [submission, workspace] = await Promise.all([
    getWorkspaceSubmissionDetail(actor, id, submissionId).catch(() => null),
    getWorkspaceDetail(id, access),
  ]);
  if (!submission) notFound();

  const selectedRunId = query.runId ?? submission.latestRun.id;
  const [runs, results] = await Promise.all([
    listSubmissionRunsPage({ actor, workspaceId: id, submissionId, limit: 25, cursor: query.runCursor ?? null }),
    listRunResultsPage({ actor, workspaceId: id, submissionId, runId: selectedRunId, limit: 25, cursor: query.resultCursor ?? null }),
  ]);
  const questionHref = `/workspaces/${id}/questions/${submission.question.slug}`;
  const selectedRun = selectedRunId === submission.latestRun.id
    ? submission.latestRun
    : runs.items.find((run) => run.id === selectedRunId);
  const runColumns: DataTableColumn<(typeof runs.items)[number]>[] = [
    {
      id: "sequence",
      header: "Sequence",
      cell: (run) => <Link className="font-medium underline-offset-4 hover:underline" href={`?runId=${run.id}`}>#{run.sequence}</Link>,
    },
    {
      id: "trigger",
      header: "Trigger",
      cellClassName: "capitalize",
      cell: (run) => run.trigger,
    },
    {
      id: "status",
      header: "Status",
      cell: (run) => <SubmissionStatusBadge status={run.status} />,
    },
    {
      id: "score",
      header: "Score",
      cell: (run) => formatScore(run.score),
    },
    {
      id: "created",
      header: "Created",
      cellClassName: "text-slate-500",
      cell: (run) => formatDate(run.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/workspaces" className="hover:text-slate-900 dark:hover:text-white">Workspaces</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/workspaces/${id}`} className="hover:text-slate-900 dark:hover:text-white">{workspace.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={questionHref} className="font-medium hover:text-slate-900 dark:hover:text-white">{submission.question.title}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-slate-900 dark:text-white">Submission details</span>
        </nav>

        <div className="mt-4 space-y-4 overflow-hidden rounded-[30px] border border-slate-200 bg-[var(--tint-sm)] p-5 shadow-sm dark:border-slate-800/60">
          <div className="flex items-start justify-between gap-4">
            <div className="pl-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{submission.question.title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Submitted by {submission.student.username} on {formatDate(submission.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 pr-2">
              {submission.student.id === actor.userId ? (
                <ReviseSubmissionButton
                  questionId={submission.question.id}
                  questionHref={questionHref}
                  language={submission.language}
                  sourceCode={submission.sourceCode}
                />
              ) : null}
              {access.staff ? <WorkspaceRejudgeButton workspaceId={id} target={{ kind: "submission", id: submission.id }} /> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmissionStatusBadge status={submission.latestRun.status} />
            <Badge variant="default" className="rounded-full font-semibold">
              Passed {submission.latestRun.passedCount}/{submission.latestRun.totalCount}
            </Badge>
            <Badge variant="secondary" className="rounded-full font-semibold">
              Score {formatScore(submission.effectiveScore ?? submission.latestRun.score)}
            </Badge>
            <Badge variant={submission.isRanked ? "secondary" : "outline"} className="rounded-full font-semibold">
              {submission.isRanked ? "Ranked" : "Unranked"}
            </Badge>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[var(--tint-sm)] p-4 shadow-sm dark:border-slate-800/60">
        <div className="flex items-center justify-between gap-4 pb-2">
          <h2 className="pl-2 text-sm font-bold text-slate-900 dark:text-white">Submitted code</h2>
          <Badge variant="secondary" className="rounded-full font-semibold">{submission.language}</Badge>
        </div>
        <SubmissionCodeViewer sourceCode={submission.sourceCode} language={submission.language} />
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[var(--tint-sm)] p-4 shadow-sm dark:border-slate-800/60">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pl-2 pr-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {selectedRunId === submission.latestRun.id ? "Latest run results" : `Run #${selectedRun?.sequence ?? "?"} results`}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Immutable grading output for this run.</p>
          </div>
          {selectedRun ? <SubmissionStatusBadge status={selectedRun.status} /> : null}
        </div>
        <div className="space-y-6">
          {results.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800">No testcase results for this run.</div>
          ) : results.items.map((result) => (
            <div key={result.id} className="space-y-3">
              <div className="flex flex-row items-center justify-between gap-4 pb-1">
                <h3 className="pl-2 text-sm font-bold text-slate-900 dark:text-white">{result.testcaseName ?? `Test ${result.testcaseSortOrder + 1}`}</h3>
                <div className="flex items-center gap-2 pr-2">
                  <SubmissionStatusBadge status={result.status} />
                  <span className="text-xs font-semibold text-slate-500">{result.runtimeMs ?? 0} ms</span>
                </div>
              </div>
              {result.isHidden && result.actualOutput === null && result.expectedOutput === null ? (
                <div className="rounded-[16px] border border-black/5 bg-white p-3 text-sm text-slate-500 dark:border-white/10 dark:bg-[#0d0e12]">Hidden testcase output</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <OutputBlock label="Expected" value={result.expectedOutput} />
                  <OutputBlock label="Actual" value={result.actualOutput} />
                </div>
              )}
              {access.staff && result.errorMessage ? (
                <pre className="mt-2 whitespace-pre-wrap rounded-[16px] border border-red-500/20 bg-red-500/10 p-3 font-mono text-xs text-red-600 dark:text-red-400">{result.errorMessage}</pre>
              ) : null}
            </div>
          ))}
        </div>
        {results.nextCursor ? (
          <Link
            className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
            href={`?${new URLSearchParams({
              runId: selectedRunId,
              ...(query.runCursor ? { runCursor: query.runCursor } : {}),
              resultCursor: results.nextCursor,
            }).toString()}`}
          >
            Next testcase page
          </Link>
        ) : null}
      </section>

      <DataTable
        title="Run history"
        rows={runs.items}
        columns={runColumns}
        getRowKey={(run) => run.id}
        emptyMessage="No grading runs yet."
        pagination={runs.nextCursor ? (
          <DataTablePagination
            next={{
              label: "Next",
              href: `?${new URLSearchParams({ runId: selectedRunId, runCursor: runs.nextCursor }).toString()}`,
            }}
          />
        ) : null}
      />
    </div>
  );
}

function OutputBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 pl-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <pre className="min-h-[48px] flex-grow whitespace-pre-wrap rounded-[16px] border border-black/5 bg-white p-3 font-mono text-xs !text-zinc-800 dark:border-white/10 dark:bg-[#0d0e12] dark:!text-zinc-200">{value || " "}</pre>
    </div>
  );
}
