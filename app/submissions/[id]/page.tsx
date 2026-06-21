import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { RejudgeButton } from "@/components/submissions/rejudge-button";
import { ReviseSubmissionButton } from "@/components/submissions/revise-submission-button";
import { SubmissionCodeViewer } from "@/components/submissions/submission-code-viewer";
import { SubmissionStatusBadge } from "@/components/submissions/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { formatDate, formatScore } from "@/lib/utils";
import { getSubmissionDetail } from "@/server/services/submission-service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SubmissionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const submission = await getSubmissionDetail(id, session.userId, session.role);
  if (!submission) {
    notFound();
  }

  const classroom = submission.assignment?.classroom;
  const questionHref = classroom
    ? `/questions/${submission.question.slug}?assignmentId=${submission.assignmentId}&classroomId=${classroom.id}`
    : `/questions/${submission.question.slug}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          {classroom ? (
            <>
              <Link href="/classrooms" className="hover:text-slate-900">
                Workspaces
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/classrooms/${classroom.id}`} className="hover:text-slate-900">
                {classroom.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={questionHref} className="hover:text-slate-900 font-medium">
                {submission.question.title}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Link href="/questions" className="hover:text-slate-900">
                Problems
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/questions/${submission.question.slug}`} className="hover:text-slate-900 font-medium">
                {submission.question.title}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="truncate text-slate-900 dark:text-slate-200">Submission Details</span>
        </nav>

        {/* Header Panel */}
        <div className="overflow-hidden rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-[var(--tint-sm)] shadow-sm p-5 space-y-4 mt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="pl-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {submission.question.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Submitted {formatDate(submission.createdAt)}
              </p>
            </div>
            {session.role === "admin" && (
              <div className="pr-2">
                <RejudgeButton submissionId={submission.id} />
              </div>
            )}
            {session.role !== "admin" ? (
              <div className="pr-2">
                <ReviseSubmissionButton
                  questionId={submission.questionId}
                  assignmentId={submission.assignmentId}
                  questionHref={questionHref}
                  language={submission.language}
                  sourceCode={submission.sourceCode}
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmissionStatusBadge status={submission.status} isLate={submission.isLate} />
            <Badge variant="default" className="rounded-full font-semibold">
              Passed {submission.passedCount}/{submission.totalCount}
            </Badge>
            <Badge variant="secondary" className="rounded-full font-semibold">
              Score {formatScore(submission.score)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-[var(--tint-sm)] shadow-sm p-4">
        <div className="flex items-center justify-between gap-4 pb-2">
          <h2 className="text-sm font-bold pl-2 text-slate-900 dark:text-white">Submitted code</h2>
          <Badge variant="secondary" className="rounded-full font-semibold">
            {submission.language}
          </Badge>
        </div>
        <SubmissionCodeViewer sourceCode={submission.sourceCode} language={submission.language} />
      </div>

      {/* Testcase Results */}
      <div className="overflow-hidden rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-[var(--tint-sm)] shadow-sm p-4">
        <div className="space-y-6">
          {submission.testcaseResults.map((result) => (
            <div key={result.id} className="space-y-3">
              {/* Header: title + status/runtime */}
              <div className="flex flex-row items-center justify-between gap-4 pb-1">
                <h3 className="text-sm font-bold pl-2 text-slate-900 dark:text-white">
                  {result.testcase.name ?? result.testcase.id}
                </h3>
                <div className="flex items-center gap-2 pr-2">
                  <SubmissionStatusBadge status={result.status} />
                  <span className="text-xs text-slate-500 font-semibold">{result.runtimeMs ?? 0} ms</span>
                </div>
              </div>

              {/* Content: Expected & Actual Outputs */}
              <div className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col h-full">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 pl-2">Expected</p>
                    <pre className="flex-grow rounded-[16px] bg-white dark:bg-[#0d0e12] border border-black/5 dark:border-white/10 p-3 font-mono text-xs !text-zinc-800 dark:!text-zinc-200 whitespace-pre-wrap min-h-[48px]">
                      {result.expectedOutput || " "}
                    </pre>
                  </div>
                  <div className="flex flex-col h-full">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 pl-2">Actual</p>
                    <pre className="flex-grow rounded-[16px] bg-white dark:bg-[#0d0e12] border border-black/5 dark:border-white/10 p-3 font-mono text-xs !text-zinc-800 dark:!text-zinc-200 whitespace-pre-wrap min-h-[48px]">
                      {result.actualOutput || " "}
                    </pre>
                  </div>
                </div>
                {result.errorMessage && session.role === "admin" ? (
                  <pre className="rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 text-xs font-mono whitespace-pre-wrap mt-2">
                    {result.errorMessage}
                  </pre>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
