"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { QuestionTable, type WorkspaceQuestionRow } from "@/modules/workspaces/components/question-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate, formatScore } from "@/lib/utils";

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
type SortDirection = "asc" | "desc";

export function WorkspaceTabs({
  questions,
  scoreboard,
  members,
  workspaceId,
  canManage,
}: {
  questions: WorkspaceQuestionRow[];
  scoreboard: ScoreboardEntry[];
  members: WorkspaceMember[];
  workspaceId: string;
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Section>("questions");
  const [hasClicked, setHasClicked] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const [scoreSort, setScoreSort] = useState<SortDirection>("desc");
  const [participantSort, setParticipantSort] = useState<SortDirection>("asc");

  const tabs: Section[] = canManage
    ? ["questions", "scoreboard", "participants"]
    : ["questions", "scoreboard"];
  const activeIndex = tabs.indexOf(activeTab);
  const tabCount = tabs.length;
  const gap = 2;
  const totalGapWidth = (tabCount - 1) * gap;

  const sortedScoreboard = useMemo(() => [...scoreboard].sort((left, right) => {
    const difference = Number(left.totalScore) - Number(right.totalScore);
    if (difference !== 0) return scoreSort === "desc" ? -difference : difference;
    return left.username.localeCompare(right.username);
  }), [scoreboard, scoreSort]);

  const sortedParticipants = useMemo(() => members
    .filter((member) => member.role === "student" && member.platformRole === "student")
    .sort((left, right) => {
      const difference = new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime();
      return participantSort === "asc" ? difference : -difference;
    }), [members, participantSort]);

  const indicatorStyle = {
    left: `calc(2px + ((100% - 4px - ${totalGapWidth}px) / ${tabCount} + ${gap}px) * ${activeIndex})`,
    width: `calc((100% - 4px - ${totalGapWidth}px) / ${tabCount})`,
    "--active-width": `calc((100% - 4px - ${totalGapWidth}px) / ${tabCount})`,
    transition: "left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  } as CSSProperties;

  function selectTab(tab: Section) {
    if (tab === activeTab) return;
    setHasClicked(true);
    setAnimationClass((current) => current === "animate-rubber-light" ? "animate-rubber-dark" : "animate-rubber-light");
    setActiveTab(tab);
  }

  const scoreboardColumns: DataTableColumn<ScoreboardEntry>[] = [
    {
      id: "rank",
      header: "Rank",
      headerClassName: "w-12 pl-4",
      cellClassName: "pl-4 font-medium tabular-nums text-slate-400",
      cell: (_entry, index) => index + 1,
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
      <div className="flex flex-col justify-between gap-4 rounded-[30px] border border-slate-200 bg-[var(--tint-sm)] p-2 shadow-sm dark:border-slate-800/60 sm:flex-row sm:items-center">
        <h3 className="p-2 text-sm font-semibold text-slate-700">Workspace Sections</h3>
        <div className="scrollbar-none flex w-full justify-start overflow-x-auto sm:w-auto sm:justify-end">
          <div className={cn(
            "relative flex h-[42px] w-full shrink-0 cursor-pointer select-none items-center gap-[2px] rounded-full border border-black/5 bg-white p-[2px] dark:border-white/5 dark:bg-[#0d0e12] sm:w-auto",
            canManage ? "sm:w-[384px]" : "sm:w-[260px]",
          )}>
            <div
              className={cn(
                "pointer-events-none absolute top-[2px] h-[36px] rounded-full bg-[var(--tint-sm)]",
                hasClicked && animationClass,
              )}
              style={indicatorStyle}
            />
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                className={cn(
                  "relative z-10 flex h-[36px] flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-semibold capitalize transition-colors duration-200",
                  activeTab === tab
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300",
                )}
              >
                {tab === "questions" ? "Questions" : tab === "scoreboard" ? "Scoreboard" : "Participants"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TabsContent value="questions" className="mt-3 focus-visible:outline-none">
        <QuestionTable questions={questions} workspaceId={workspaceId} canManage={canManage} />
      </TabsContent>

      <TabsContent value="scoreboard" className="mt-3 focus-visible:outline-none">
        <DataTable
          title="Scoreboard"
          rows={sortedScoreboard}
          columns={scoreboardColumns}
          getRowKey={(entry) => entry.userId}
          emptyMessage="No submissions yet."
          rowClassName={(_entry, index) => cn("transition-colors", index % 2 === 1 && "bg-black/[0.02] dark:bg-white/[0.02]")}
          actions={(
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setScoreSort((current) => current === "desc" ? "asc" : "desc")}
              className="h-9 w-[150px] rounded-full bg-black px-3 font-normal !text-white transition-colors hover:bg-zinc-900/90 dark:bg-white dark:!text-black dark:hover:bg-zinc-100/90"
            >
              {scoreSort === "desc" ? "High → Low" : "Low → High"}
            </Button>
          )}
        />
      </TabsContent>

      {canManage ? (
        <TabsContent value="participants" className="mt-3 focus-visible:outline-none">
          <DataTable
            title="Participants"
            rows={sortedParticipants}
            columns={participantColumns}
            getRowKey={(member) => member.id}
            emptyMessage="No participants yet."
            rowClassName={(_member, index) => cn("transition-colors", index % 2 === 1 && "bg-black/[0.02] dark:bg-white/[0.02]")}
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="h-9 rounded-full">
                  <Link href={`/workspaces/${workspaceId}/members`}>Open roster</Link>
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setParticipantSort((current) => current === "desc" ? "asc" : "desc")}
                  className="h-9 w-[150px] rounded-full bg-black px-3 font-normal !text-white transition-colors hover:bg-zinc-900/90 dark:bg-white dark:!text-black dark:hover:bg-zinc-100/90"
                >
                  {participantSort === "desc" ? "Newest → Oldest" : "Oldest → Newest"}
                </Button>
              </>
            }
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
