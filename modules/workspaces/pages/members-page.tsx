import Link from "next/link";
import { notFound } from "next/navigation";

import { MemberManager } from "@/modules/workspaces/components/member-manager";
import { PageHeader } from "@/components/common/page-header";
import { requirePageUser } from "@/lib/auth";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { listWorkspaceMembersPage } from "@/server/workspaces/queries";

export default async function WorkspaceMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser();
  const { id } = await params;
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.staff) notFound();
  const memberPage = await listWorkspaceMembersPage({ actor, workspaceId: id, limit: 25, cursor: null });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Members"
        description={access.admin ? "Global administrators can change roles and remove members." : "Workspace staff can view this roster. Membership changes require a global administrator."}
        actions={<Link className="text-sm underline" href={`/workspaces/${id}`}>Back to workspace</Link>}
      />
      <MemberManager workspaceId={id} initialPage={memberPage} canManage={access.admin} />
    </div>
  );
}
