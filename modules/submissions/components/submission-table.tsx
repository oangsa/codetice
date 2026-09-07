import Link from "next/link";
import type { ReactNode } from "react";

import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/common/data-table";
import { SubmissionStatusBadge } from "@/modules/submissions/components/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatScore } from "@/lib/utils";

export type WorkspaceSubmissionListItem = {
  id: string;
  latestStatus: string;
  score: string | null;
  isRanked: boolean;
  createdAt: string | Date;
  student: { id: string; username: string };
  question: { id: string; title: string; slug: string };
};

export function SubmissionTable({
  workspaceId,
  submissions,
  showQuestion = true,
  title = "Submissions",
  actions,
  pagination,
  emptyMessage = "No submissions yet.",
  sort = null,
  onSortChange,
  getSortHref,
}: {
  workspaceId: string;
  submissions: WorkspaceSubmissionListItem[];
  showQuestion?: boolean;
  title?: ReactNode;
  actions?: ReactNode;
  pagination?: ReactNode;
  emptyMessage?: ReactNode;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;
  getSortHref?: (sort: DataTableSort) => string;
}) {
  const linkedCell = (submission: WorkspaceSubmissionListItem, content: ReactNode, className = "block") => (
    <Link
      href={`/workspaces/${workspaceId}/submissions/${submission.id}`}
      prefetch={false}
      className={`-m-4 p-4 ${className}`}
    >
      {content}
    </Link>
  );
  const columns: DataTableColumn<WorkspaceSubmissionListItem>[] = [
    ...(showQuestion ? [{
      id: "question",
      header: "Question",
      sortKey: "question",
      cell: (submission: WorkspaceSubmissionListItem) => linkedCell(submission, (
        <>
          <span className="font-medium text-slate-900 dark:text-white">{submission.question.title}</span>
          <span className="text-xs text-slate-500">{submission.student.username}</span>
        </>
      ), "flex flex-col"),
    } satisfies DataTableColumn<WorkspaceSubmissionListItem>] : []),
    {
      id: "status",
      header: "Status",
      sortKey: "status",
      cell: (submission) => linkedCell(submission, <SubmissionStatusBadge status={submission.latestStatus} />),
    },
    {
      id: "score",
      header: "Score",
      sortKey: "score",
      cell: (submission) => linkedCell(submission, <Badge variant="secondary">{formatScore(submission.score ?? "0")}</Badge>),
    },
    {
      id: "ranking",
      header: "Ranking",
      sortKey: "ranking",
      cell: (submission) => linkedCell(submission, (
        <Badge variant={submission.isRanked ? "secondary" : "outline"}>{submission.isRanked ? "Ranked" : "Unranked"}</Badge>
      )),
    },
    {
      id: "submitted",
      header: "Submitted",
      sortKey: "submitted",
      cellClassName: "text-slate-500",
      cell: (submission) => linkedCell(submission, formatDate(submission.createdAt)),
    },
  ];

  return (
    <DataTable
      title={title}
      rows={submissions}
      columns={columns}
      sort={sort}
      onSortChange={onSortChange}
      getSortHref={getSortHref}
      getRowKey={(submission) => submission.id}
      actions={actions}
      pagination={pagination}
      emptyMessage={emptyMessage}
      rowClassName="cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
    />
  );
}
