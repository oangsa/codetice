import { CreateWorkspaceForm } from "@/modules/workspaces/components/create-workspace-form";
import { JoinWorkspaceForm } from "@/modules/workspaces/components/join-workspace-form";
import { WorkspaceSearch } from "@/modules/workspaces/components/workspace-search";
import { PageHeader } from "@/components/common/page-header";
import { requirePageUser } from "@/lib/auth";
import { listWorkspacesPage } from "@/server/workspaces/queries";

export default async function WorkspacesDashboardPage() {
  const actor = await requirePageUser();
  const page = await listWorkspacesPage({
    actor,
    pageNumber: 1,
    pageSize: 25,
    search: "",
  });
  return (
    <div className="space-y-4">
      <WorkspaceSearch
        initialPage={page}
        actions={actor.role === "admin" ? <CreateWorkspaceForm /> : <JoinWorkspaceForm />}
      >
        <div>
          <PageHeader
            title="Workspaces"
            className="py-0"
          />
        </div>
      </WorkspaceSearch>
    </div>
  );
}
