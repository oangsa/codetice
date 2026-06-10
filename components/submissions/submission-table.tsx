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
    score: string;
    passedCount: number;
    totalCount: number;
    createdAt: Date;
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
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => (
          <TableRow key={submission.id}>
            {showQuestion ? (
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{submission.question?.title ?? "Unknown question"}</span>
                  {submission.user ? <span className="text-xs text-slate-500">{submission.user.username}</span> : null}
                </div>
              </TableCell>
            ) : null}
            <TableCell>
              <SubmissionStatusBadge status={submission.status} />
            </TableCell>
            <TableCell>
              <Badge variant="info">{formatScore(submission.score)}</Badge>
            </TableCell>
            <TableCell>
              {submission.passedCount}/{submission.totalCount}
            </TableCell>
            <TableCell>{formatDate(submission.createdAt)}</TableCell>
            <TableCell className="text-right">
              <Link href={`/submissions/${submission.id}`} className="text-sm font-medium text-sky-700 hover:text-sky-800">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
