import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { DataTablePagination } from "@/components/common/data-table";
import { WorkspaceSubmissionFilters } from "@/modules/submissions/components/workspace-submission-filters";
import { SubmissionTable } from "@/modules/submissions/components/submission-table";
import { requirePageUser } from "@/lib/auth";
import { collectCursorItems } from "@/lib/pagination";
import { listWorkspaceQuestionsPage } from "@/server/questions/queries";
import { listWorkspaceSubmissionsPage } from "@/server/submissions/queries";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { listWorkspaceMembersPage } from "@/server/workspaces/queries";

export default async function WorkspaceSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ questionId?: string; studentId?: string; cursor?: string }>;
}) {
  const actor = await requirePageUser();
  const { id } = await params;
  const query = await searchParams;
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.member) notFound();

  const [page, questionItems, memberItems] = await Promise.all([
    listWorkspaceSubmissionsPage({
      actor,
      workspaceId: id,
      questionId: query.questionId ?? null,
      studentId: query.studentId ?? null,
      limit: 25,
      cursor: query.cursor ?? null,
    }),
    access.staff
      ? collectCursorItems((cursor) => listWorkspaceQuestionsPage({
          workspaceId: id,
          userId: actor.userId,
          includeDrafts: true,
          limit: 100,
          cursor,
        }))
      : Promise.resolve(null),
    access.staff
      ? collectCursorItems((cursor) => listWorkspaceMembersPage({ workspaceId: id, limit: 100, cursor }))
      : Promise.resolve(null),
  ]);

  const nextHref = page.nextCursor
    ? `?${new URLSearchParams({
        ...(query.questionId ? { questionId: query.questionId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        cursor: page.nextCursor,
      }).toString()}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Submissions"
        description="Official attempts in this workspace, newest first."
        actions={<Link className="text-sm font-medium underline-offset-4 hover:underline" href={`/workspaces/${id}`}>Back to workspace</Link>}
      />
      <SubmissionTable
        workspaceId={id}
        submissions={page.items}
        title="Submission history"
        emptyMessage="No submissions match these filters."
        actions={access.staff && questionItems && memberItems ? (
          <WorkspaceSubmissionFilters
            questions={questionItems.map((item) => ({ id: item.id, title: item.title }))}
            students={memberItems
              .filter((item) => item.role === "student" && item.platformRole === "student")
              .map((item) => ({ id: item.userId, username: item.username }))}
          />
        ) : null}
        pagination={nextHref ? <DataTablePagination next={{ label: "Next", href: nextHref }} /> : null}
      />
    </div>
  );
}
