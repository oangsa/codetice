"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Search } from "lucide-react";

import { DataTablePagination } from "@/components/common/data-table";
import { Input } from "@/components/ui/input";
import { useCollectionSearch } from "@/lib/use-collection-search";
import { WorkspaceCard } from "@/modules/workspaces/components/workspace-card";

type WorkspaceRow = {
  id: string;
  name: string;
  creatorName: string;
  memberCount: number;
  questionCount: number;
  solvedCount: number;
  progressPercent: number;
};

export function WorkspaceSearch({
  initialPage,
  actions,
  children,
}: {
  initialPage: { items: WorkspaceRow[]; nextCursor: string | null; hasMore: boolean };
  actions: ReactNode;
  children: ReactNode;
}) {
  const [value, setValue] = useState("");
  const request = useMemo(() => ({
    limit: 25,
    ...(value.trim() ? { searchTerm: { name: "name", value } } : {}),
  }), [value]);
  const collection = useCollectionSearch<WorkspaceRow>({
    endpoint: "/api/workspaces/search",
    initialPage,
    request,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search workspace"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search workspace"
            className="h-9 rounded-md pl-9"
          />
        </div>
        {actions}
      </div>
      {children}
      {collection.page.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">{collection.error ?? (value.trim() ? "No workspaces match your search" : "No workspaces yet")}</p>
          <p className="mt-1 text-sm text-slate-400">{value.trim() ? "Try a different workspace name." : "Join a workspace with an invite code to get started."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collection.page.items.map((workspace) => <WorkspaceCard key={workspace.id} workspace={workspace} />)}
        </div>
      )}
      {collection.hasPrevious || collection.page.nextCursor ? (
        <DataTablePagination
          previous={{ label: "Prev", disabled: !collection.hasPrevious || collection.isLoading, onClick: collection.previous }}
          next={{ label: "Next", disabled: !collection.page.nextCursor || collection.isLoading, onClick: collection.next }}
        />
      ) : null}
    </div>
  );
}
