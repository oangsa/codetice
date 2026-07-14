"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, DataTablePagination, DataTableSearch, type DataTableColumn } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/common/button";
import { useCollectionSearch } from "@/lib/use-collection-search";
import type { PagedResult } from "@/lib/pagination";

type Member = {
  id: string;
  userId: string;
  username: string;
  platformRole: "student" | "admin";
  role: "student" | "ta";
  joinedAt: Date | string;
};

export function MemberManager({
  workspaceId,
  initialPage,
  canManage,
}: {
  workspaceId: string;
  initialPage: PagedResult<Member>;
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const request = useMemo(() => ({
    ...(search.trim() ? { searchTerm: { name: "username", value: search } } : {}),
  }), [search]);
  const collection = useCollectionSearch<Member>({
    endpoint: `/api/workspaces/${workspaceId}/members/search`,
    initialPage,
    request,
  });

  async function setRole(member: Member, role: "student" | "ta") {
    setPendingUserId(member.userId);
    const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const body = await response.json() as { message?: string };
    if (response.ok) {
      collection.reload();
      toast.success(`${member.username} is now ${role === "ta" ? "a TA" : "a student"}.`);
    } else {
      toast.error(body.message ?? "Unable to update member.");
    }
    setPendingUserId(null);
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.username} from this workspace?`)) return;
    setPendingUserId(member.userId);
    const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.userId}`, { method: "DELETE" });
    const body = await response.json() as { message?: string };
    if (response.ok) {
      collection.reload();
      toast.success(`${member.username} was removed.`);
    } else {
      toast.error(body.message ?? "Unable to remove member.");
    }
    setPendingUserId(null);
  }

  const columns: DataTableColumn<Member>[] = [
    {
      id: "user",
      header: "User",
      cellClassName: "font-medium text-slate-900 dark:text-white",
      cell: (member) => member.username,
    },
    {
      id: "role",
      header: "Role",
      cell: (member) => <Badge variant={member.role === "ta" ? "default" : "secondary"}>{member.role === "ta" ? "TA" : "Student"}</Badge>,
    },
    ...(canManage ? [{
      id: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (member: Member) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button className="h-10 rounded-full px-5 font-semibold" variant="outline" disabled={pendingUserId === member.userId} onClick={() => setRole(member, member.role === "ta" ? "student" : "ta")}>
            {member.role === "ta" ? "Make student" : "Make TA"}
          </Button>
          <Button className="h-10 rounded-full px-5 font-semibold" variant="destructive" disabled={pendingUserId === member.userId} onClick={() => remove(member)}>Remove</Button>
        </div>
      ),
    } satisfies DataTableColumn<Member>] : []),
  ];

  return (
    <DataTable
      title="Members"
      rows={collection.page.items}
      columns={columns}
      getRowKey={(member) => member.id}
      emptyMessage={collection.error ?? (search ? "No members match your search." : "No members yet.")}
      search={<DataTableSearch value={search} onValueChange={setSearch} placeholder="Search members" />}
      rowClassName={(_member, index) =>
        index % 2 === 1 ? "bg-black/[0.02] dark:bg-white/[0.02]" : undefined
      }
      pagination={
        <DataTablePagination
          meta={collection.page.meta}
          itemCount={collection.page.items.length}
          itemName="members"
          isLoading={collection.isLoading}
          onPageChange={collection.goToPage}
          onPageSizeChange={collection.setPageSize}
        />
      }
    />
  );
}
