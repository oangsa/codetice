import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { DataTablePagination, type DataTableSort } from "@/components/common/data-table";
import { WorkspaceSubmissionFilters } from "@/modules/submissions/components/workspace-submission-filters";
import { SubmissionTable } from "@/modules/submissions/components/submission-table";
import { requirePageUser } from "@/lib/auth";
import { collectPagedItems, parsePageRequest } from "@/lib/pagination";
import { parseCollectionSortFromSearchParams } from "@/lib/collection-search";
import { listWorkspaceQuestionsPage } from "@/server/questions/queries";
import { listWorkspaceSubmissionsPage } from "@/server/submissions/queries";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { listWorkspaceMembersPage } from "@/server/workspaces/queries";

export default async function WorkspaceSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ questionId?: string; studentId?: string; pageNumber?: string; sortBy?: string; sortDirection?: string }>;
}) {
  const actor = await requirePageUser();
  const { id } = await params;
  const query = await searchParams;
  const activeSearchParams = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const sort = parseCollectionSortFromSearchParams(activeSearchParams) ?? null;
  const pageRequest = parsePageRequest({ pageNumber: query.pageNumber, pageSize: 25 });
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.member) notFound();

  const [page, questionItems, memberItems] = await Promise.all([
    listWorkspaceSubmissionsPage({
      actor,
      workspaceId: id,
      questionId: query.questionId ?? null,
      studentId: query.studentId ?? null,
      sort: sort ?? undefined,
      ...pageRequest,
    }),
    access.staff
      ? collectPagedItems((pagination) => listWorkspaceQuestionsPage({
          actor,
          workspaceId: id,
          ...pagination,
        }))
      : Promise.resolve(null),
    access.staff
      ? collectPagedItems((pagination) => listWorkspaceMembersPage({ actor, workspaceId: id, ...pagination }))
      : Promise.resolve(null),
  ]);

  const getPageHref = (pageNumber: number) => `?${new URLSearchParams({
        ...(query.questionId ? { questionId: query.questionId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(sort ? { sortBy: sort.name, sortDirection: sort.direction } : {}),
        pageNumber: String(pageNumber),
      }).toString()}`;
  const getSortHref = (nextSort: DataTableSort) => `?${new URLSearchParams({
    ...(query.questionId ? { questionId: query.questionId } : {}),
    ...(query.studentId ? { studentId: query.studentId } : {}),
    sortBy: nextSort.name,
    sortDirection: nextSort.direction,
    pageNumber: "1",
  }).toString()}`;

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
        sort={sort}
        getSortHref={getSortHref}
        actions={access.staff && questionItems && memberItems ? (
          <WorkspaceSubmissionFilters
            questions={questionItems.map((item) => ({ id: item.id, title: item.title }))}
            students={memberItems
              .filter((item) => item.role === "student" && item.platformRole === "student")
              .map((item) => ({ id: item.userId, username: item.username }))}
          />
        ) : null}
        pagination={
          <DataTablePagination
            meta={page.meta}
            itemCount={page.items.length}
            itemName="submissions"
            getPageHref={getPageHref}
          />
        }
      />
    </div>
  );
}
