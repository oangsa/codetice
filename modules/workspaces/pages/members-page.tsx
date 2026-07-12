import Link from "next/link";
import { notFound } from "next/navigation";

import { MemberManager } from "@/modules/workspaces/components/member-manager";
import { PageHeader } from "@/components/common/page-header";
import { requirePageUser } from "@/lib/auth";
import { collectCursorItems } from "@/lib/pagination";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { listWorkspaceMembersPage } from "@/server/workspaces/queries";

export default async function WorkspaceMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser();
  const { id } = await params;
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.staff) notFound();
  const members = await collectCursorItems((cursor) => (
    listWorkspaceMembersPage({ workspaceId: id, limit: 100, cursor })
  ));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Members"
        description={access.admin ? "Global administrators can change roles and remove members." : "Workspace staff can view this roster. Membership changes require a global administrator."}
        actions={<Link className="text-sm underline" href={`/workspaces/${id}`}>Back to workspace</Link>}
      />
      <MemberManager workspaceId={id} initialMembers={members} canManage={access.admin} />
    </div>
  );
}
