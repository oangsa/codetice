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
    <Table className="text-slate-300">
      <TableHeader>
        <TableRow className="border-white/8 hover:bg-transparent">
          {showQuestion ? <TableHead className="text-slate-500">Question</TableHead> : null}
          <TableHead className="text-slate-500">Status</TableHead>
          <TableHead className="text-slate-500">Score</TableHead>
          <TableHead className="text-slate-500">Passed</TableHead>
          <TableHead className="text-slate-500">Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => (
          <TableRow key={submission.id} className="border-white/6 hover:bg-white/[0.03]">
            {showQuestion ? (
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-100">{submission.question?.title ?? "Unknown question"}</span>
                  {submission.user ? <span className="text-xs text-slate-500">{submission.user.username}</span> : null}
                </div>
              </TableCell>
            ) : null}
            <TableCell>
              <SubmissionStatusBadge status={submission.status} />
            </TableCell>
            <TableCell>
              <Badge variant="info" className="border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
                {formatScore(submission.score)}
              </Badge>
            </TableCell>
            <TableCell>
              {submission.passedCount}/{submission.totalCount}
            </TableCell>
            <TableCell>{formatDate(submission.createdAt)}</TableCell>
            <TableCell className="text-right">
              <Link href={`/submissions/${submission.id}`} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
