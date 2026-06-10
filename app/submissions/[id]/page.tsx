import { notFound } from "next/navigation";

import { RejudgeButton } from "@/components/submissions/rejudge-button";
import { SubmissionStatusBadge } from "@/components/submissions/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatDate, formatScore } from "@/lib/utils";
import { getSubmissionDetail } from "@/server/services/submission-service";

export default async function SubmissionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;

  const submission = await getSubmissionDetail(id, session.userId, session.role);
  if (!submission) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{submission.question.title}</CardTitle>
            <CardDescription>Submitted {formatDate(submission.createdAt)}</CardDescription>
          </div>
          {session.role === "admin" ? <RejudgeButton submissionId={submission.id} /> : null}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <SubmissionStatusBadge status={submission.status} />
          <Badge variant="info">Score {formatScore(submission.score)}</Badge>
          <Badge variant="default">
            Passed {submission.passedCount}/{submission.totalCount}
          </Badge>
          {submission.gradingJobs[0] ? (
            <Badge variant="warning">job {submission.gradingJobs[0].status}</Badge>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {submission.testcaseResults.map((result) => (
          <Card key={result.id}>
            <CardHeader>
              <CardTitle className="text-sm">{result.testcase.name ?? result.testcase.id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <SubmissionStatusBadge status={result.status} />
                <span className="text-xs text-slate-500">{result.runtimeMs ?? 0} ms</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Expected</p>
                  <pre className="rounded-md bg-slate-100 p-3 whitespace-pre-wrap">{result.expectedOutput ?? "Hidden"}</pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Actual</p>
                  <pre className="rounded-md bg-slate-100 p-3 whitespace-pre-wrap">{result.actualOutput ?? "Hidden"}</pre>
                </div>
              </div>
              {result.errorMessage ? (
                <pre className="rounded-md bg-slate-800 p-3 text-xs text-slate-100 whitespace-pre-wrap">
                  {result.errorMessage}
                </pre>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
