import Link from "next/link";
import { BookOpen } from "lucide-react";

import { WorkspaceCard } from "@/modules/workspaces/components/workspace-card";
import { CreateWorkspaceForm } from "@/modules/workspaces/components/create-workspace-form";
import { JoinWorkspaceForm } from "@/modules/workspaces/components/join-workspace-form";
import { WorkspaceSearch } from "@/modules/workspaces/components/workspace-search";
import { PageHeader } from "@/components/common/page-header";
import { requirePageUser } from "@/lib/auth";
import { listWorkspacesPage } from "@/server/workspaces/queries";

export default async function WorkspacesDashboardPage({ searchParams }: { searchParams: Promise<{ cursor?: string; q?: string }> }) {
  const actor = await requirePageUser();
  const query = await searchParams;
  const workspaceSearch = typeof query.q === "string" ? query.q : "";
  const page = await listWorkspacesPage({
    actor,
    limit: 25,
    cursor: query.cursor ?? null,
    search: workspaceSearch,
  });
  return (
    <div className="space-y-4">
      <WorkspaceSearch initialQuery={workspaceSearch}>
        {actor.role === "admin" ? <CreateWorkspaceForm /> : <JoinWorkspaceForm />}
      </WorkspaceSearch>
      <div>
        <PageHeader
          eyebrow="Overview"
          title="Workspaces"
          description="Review active workspaces, open a teaching workspace, or join a workspace with an invite code."
          className="py-0"
        />
      </div>
      {page.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">
            {workspaceSearch ? "No workspaces match your search" : "No workspaces yet"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {workspaceSearch ? "Try a different workspace name." : "Join a workspace with an invite code to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {page.items.map((workspace) => <WorkspaceCard key={workspace.id} workspace={workspace} />)}
        </div>
      )}
      {page.nextCursor ? (
        <div className="flex justify-end">
          <Link className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline dark:text-slate-300" href={`/workspaces?${new URLSearchParams({ cursor: page.nextCursor, ...(workspaceSearch ? { q: workspaceSearch } : {}) }).toString()}`}>
            Next page
          </Link>
        </div>
      ) : null}
    </div>
  );
}
