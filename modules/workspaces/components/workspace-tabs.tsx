"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { DataTable, DataTablePagination, DataTableSearch, type DataTableColumn } from "@/components/common/data-table";
import { QuestionTable, type WorkspaceQuestionRow } from "@/modules/workspaces/components/question-table";
import { Button } from "@/components/common/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate, formatScore } from "@/lib/utils";
import { useCollectionSearch } from "@/lib/use-collection-search";
import type { PagedResult } from "@/lib/pagination";
import type { WorkspaceTag } from "@/lib/tags";

type ScoreboardEntry = {
  userId: string;
  username: string;
  totalScore: string;
  solvedCount: number;
  rank: number;
};

type WorkspaceMember = {
  id: string;
  userId: string;
  username: string;
  platformRole: "student" | "admin";
  role: "student" | "ta";
  joinedAt: Date;
};

type Section = "questions" | "scoreboard" | "participants";

export function WorkspaceTabs({
  questionPage,
  scoreboardPage,
  memberPage,
  workspaceId,
  canManage,
  tags,
  cloneTargets,
}: {
  questionPage: PagedResult<WorkspaceQuestionRow>;
  scoreboardPage: PagedResult<ScoreboardEntry>;
  memberPage: PagedResult<WorkspaceMember>;
  workspaceId: string;
  canManage: boolean;
  tags: WorkspaceTag[];
  cloneTargets: Array<{ id: string; name: string }>;
}) {
  const [activeTab, setActiveTab] = useState<Section>("questions");
  const [scoreSearch, setScoreSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Section, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const scoreRequest = useMemo(() => ({
    ...(scoreSearch.trim() ? { searchTerm: { name: "username", value: scoreSearch } } : {}),
  }), [scoreSearch]);
  const memberRequest = useMemo(() => ({
    search: [{ name: "role", condition: "EQUAL", value: "student" }],
    ...(participantSearch.trim() ? { searchTerm: { name: "username", value: participantSearch } } : {}),
  }), [participantSearch]);
  const scoreboard = useCollectionSearch<ScoreboardEntry>({
    endpoint: `/api/workspaces/${workspaceId}/scoreboard/search`,
    initialPage: scoreboardPage,
    request: scoreRequest,
  });
  const members = useCollectionSearch<WorkspaceMember>({
    endpoint: `/api/workspaces/${workspaceId}/members/search`,
    initialPage: memberPage,
    request: memberRequest,
  });

  const tabs: Section[] = canManage
    ? ["questions", "scoreboard", "participants"]
    : ["questions", "scoreboard"];

  const updateIndicator = useCallback(() => {
    const activeButton = tabRefs.current[activeTab];
    if (!activeButton) return;

    const nextIndicator = {
      left: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
    };
    setIndicator((current) => (
      current.left === nextIndicator.left && current.width === nextIndicator.width
        ? current
        : nextIndicator
    ));
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();

    const tabList = tabListRef.current;
    if (!tabList) return;

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(tabList);
    for (const tabButton of Object.values(tabRefs.current)) {
      if (tabButton) resizeObserver.observe(tabButton);
    }
    return () => resizeObserver.disconnect();
  }, [updateIndicator]);

  const sortedScoreboard = scoreboard.page.items;
  const sortedParticipants = members.page.items;

  function selectTab(tab: Section) {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }

  const scoreboardColumns: DataTableColumn<ScoreboardEntry>[] = [
    {
      id: "rank",
      header: "Rank",
      headerClassName: "w-12 pl-4",
      cellClassName: "pl-4 font-medium tabular-nums text-slate-400",
      cell: (entry) => entry.rank,
    },
    {
      id: "username",
      header: "Username",
      cellClassName: "font-medium text-slate-900 dark:text-white",
      cell: (entry) => entry.username,
    },
    {
      id: "solved",
      header: "Solved",
      headerClassName: "w-28 text-right",
      cellClassName: "text-right tabular-nums text-slate-500",
      cell: (entry) => entry.solvedCount,
    },
    {
      id: "score",
      header: "Total score",
      headerClassName: "w-32 pr-4 text-right",
      cellClassName: "pr-4 text-right font-semibold tabular-nums text-slate-900 dark:text-white",
      cell: (entry) => formatScore(entry.totalScore),
    },
  ];
  const participantColumns: DataTableColumn<WorkspaceMember>[] = [
    {
      id: "username",
      header: "Username",
      headerClassName: "pl-4",
      cellClassName: "pl-4 font-medium text-slate-900 dark:text-white",
      cell: (member) => member.username,
    },
    {
      id: "joined",
      header: "Joined",
      headerClassName: "w-44 pr-4 text-right",
      cellClassName: "whitespace-nowrap pr-4 text-right text-slate-500",
      cell: (member) => formatDate(member.joinedAt),
    },
  ];

  return (
    <Tabs value={activeTab} className="space-y-3">
      <div className="scrollbar-none flex w-full overflow-x-auto">
        <div
          ref={tabListRef}
          className="relative flex h-10 w-max shrink-0 cursor-pointer select-none items-center gap-1 rounded-full bg-[var(--tint-sm)] p-1"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1 h-8 rounded-full bg-background"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.width === 0 ? 0 : 1,
              transition: "left 0.25s cubic-bezier(0.25, 1, 0.5, 1), width 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          />
          {tabs.map((tab) => (
            <Button
              key={tab}
              ref={(element) => {
                tabRefs.current[tab] = element;
              }}
              type="button"
              disableTooltip
              variant="ghost"
              size="sm"
              onClick={(event) => {
                selectTab(tab);
                if (event.detail !== 0) event.currentTarget.blur();
              }}
              className={cn(
                "relative z-10 flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent px-3 text-sm font-semibold capitalize hover:bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0",
                activeTab === tab
                  ? "text-slate-950 hover:text-slate-950 dark:text-white dark:hover:text-white"
                  : "text-slate-500 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-400",
              )}
            >
              {tab === "questions" ? "Questions" : tab === "scoreboard" ? "Scoreboard" : "Participants"}
            </Button>
          ))}
        </div>
      </div>

      <TabsContent value="questions" className="mt-3 focus-visible:outline-none">
        <QuestionTable
          initialPage={questionPage}
          workspaceId={workspaceId}
          canManage={canManage}
          tags={tags}
          cloneTargets={cloneTargets}
        />
      </TabsContent>

      <TabsContent value="scoreboard" className="mt-3 focus-visible:outline-none">
        <DataTable
          title="Scoreboard"
          rows={sortedScoreboard}
          columns={scoreboardColumns}
          getRowKey={(entry) => entry.userId}
          emptyMessage={scoreboard.error ?? (scoreSearch.trim() ? "No users match your search." : "No submissions yet.")}
          search={<DataTableSearch value={scoreSearch} onValueChange={setScoreSearch} placeholder="Search username" />}
          rowClassName={(_entry, index) => cn("transition-colors", index % 2 === 1 && "bg-black/[0.02] dark:bg-white/[0.02]")}
          pagination={
            <DataTablePagination
              meta={scoreboard.page.meta}
              itemCount={sortedScoreboard.length}
              itemName="participants"
              isLoading={scoreboard.isLoading}
              onPageChange={scoreboard.goToPage}
              onPageSizeChange={scoreboard.setPageSize}
            />
          }
        />
      </TabsContent>

      {canManage ? (
        <TabsContent value="participants" className="mt-3 focus-visible:outline-none">
          <DataTable
            title="Participants"
            rows={sortedParticipants}
            columns={participantColumns}
            getRowKey={(member) => member.id}
            emptyMessage={members.error ?? (participantSearch.trim() ? "No participants match your search." : "No participants yet.")}
            search={<DataTableSearch value={participantSearch} onValueChange={setParticipantSearch} placeholder="Search username" />}
            rowClassName={(_member, index) => cn("transition-colors", index % 2 === 1 && "bg-black/[0.02] dark:bg-white/[0.02]")}
            actions={<Button asChild variant="outline" size="sm" className="h-9 rounded-full"><Link href={`/workspaces/${workspaceId}/members`}>Open roster</Link></Button>}
            pagination={
              <DataTablePagination
                meta={members.page.meta}
                itemCount={sortedParticipants.length}
                itemName="participants"
                isLoading={members.isLoading}
                onPageChange={members.goToPage}
                onPageSizeChange={members.setPageSize}
              />
            }
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
