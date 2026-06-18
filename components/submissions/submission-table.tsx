import Link from "next/link";

import { SubmissionStatusBadge } from "@/components/submissions/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatScore } from "@/lib/utils";

export function SubmissionTable({
  submissions,
  showQuestion = true,
}: {
  submissions: Array<{
    id: string;
    status: string;
    isLate: boolean;
    score: string;
    passedCount: number;
    totalCount: number;
    createdAt: string | Date;
    question?: { title: string; slug: string } | null;
    user?: { username: string } | null;
  }>;
  showQuestion?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showQuestion ? <TableHead>Question</TableHead> : null}
          <TableHead>Status</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Passed</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => {
          const href = `/submissions/${submission.id}`;

          return (
            <TableRow key={submission.id} className="cursor-pointer">
              {showQuestion ? (
                <TableCell>
                  <Link href={href} prefetch={false} className="-m-4 flex flex-col p-4">
                    <span className="font-medium text-slate-900">{submission.question?.title ?? "Unknown question"}</span>
                    {submission.user ? <span className="text-xs text-slate-500">{submission.user.username}</span> : null}
                  </Link>
                </TableCell>
              ) : null}
              <TableCell>
                <Link href={href} prefetch={false} className="-m-4 block p-4">
                  <SubmissionStatusBadge status={submission.status} isLate={submission.isLate} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={href} prefetch={false} className="-m-4 block p-4">
                  <Badge variant="secondary">
                    {formatScore(submission.score)}
                  </Badge>
                </Link>
              </TableCell>
              <TableCell className="text-slate-600">
                <Link href={href} prefetch={false} className="-m-4 block p-4">
                  {submission.passedCount}/{submission.totalCount}
                </Link>
              </TableCell>
              <TableCell className="text-slate-500">
                <Link href={href} prefetch={false} className="-m-4 block p-4">
                  {formatDate(submission.createdAt)}
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
