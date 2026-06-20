"use client";

import { useState, useMemo } from "react";
import { cn, formatDate, formatScore } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QuestionTable } from "@/components/classrooms/question-table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Search, Filter, ArrowUp, ArrowDown } from "lucide-react";

type QuestionRow = {
  rowNumber: number;
  assignmentId: string;
  assignmentTitle: string;
  dueAt: Date | null;
  questionId: string;
  title: string;
  slug: string;
  difficulty: string;
  totalScore: string;
  bestScore: string | null;
  attempts: number;
  status: "todo" | "attempted" | "accepted";
  isPublished: boolean;
};

type LeaderboardEntry = {
  userId: string;
  username: string;
  role: string;
  solved: number;
  totalScore: number;
};

type ClassroomMember = {
  id: string;
  role: string;
  joinedAt: Date;
  user: {
    username: string;
  };
};

type SortDir = "asc" | "desc";

export function ClassroomTabs({
  questions,
  leaderboard,
  members,
  classroomId,
  canManage,
}: {
  questions: QuestionRow[];
  leaderboard: LeaderboardEntry[];
  members: ClassroomMember[];
  classroomId: string;
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"assignments" | "scoreboard" | "participants">("assignments");
  const [hasClicked, setHasClicked] = useState(false);
  const [animationClass, setAnimationClass] = useState("");

  // Scoreboard state
  const [sbSearch, setSbSearch] = useState("");
  const [sbSort, setSbSort] = useState<SortDir>("desc");

  // Participants state
  const [ptSearch, setPtSearch] = useState("");
  const [ptSort, setPtSort] = useState<SortDir>("asc");

  const tabs = canManage
    ? ["assignments", "scoreboard", "participants"]
    : ["assignments", "scoreboard"];

  const activeIndex = tabs.indexOf(activeTab);
  const N = canManage ? 3 : 2;
  const G = 2;
  const totalGapWidth = (N - 1) * G;

  const handleTabClick = (tab: "assignments" | "scoreboard" | "participants") => {
    if (tab === activeTab) return;
    setHasClicked(true);
    setAnimationClass((prev) =>
      prev === "animate-rubber-light" ? "animate-rubber-dark" : "animate-rubber-light"
    );
    setActiveTab(tab);
  };

  const indicatorStyle = {
    left: `calc(2px + ((100% - 4px - ${totalGapWidth}px) / ${N} + ${G}px) * ${activeIndex})`,
    width: `calc((100% - 4px - ${totalGapWidth}px) / ${N})`,
    "--active-width": `calc((100% - 4px - ${totalGapWidth}px) / ${N})`,
    transition: "left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  } as React.CSSProperties;

  // Filtered + sorted scoreboard
  const filteredLeaderboard = useMemo(() => {
    let list = leaderboard.filter((e) =>
      e.username.toLowerCase().includes(sbSearch.toLowerCase())
    );
    list = [...list].sort((a, b) =>
      sbSort === "desc" ? b.totalScore - a.totalScore : a.totalScore - b.totalScore
    );
    return list;
  }, [leaderboard, sbSearch, sbSort]);

  // Filtered + sorted participants (students only)
  const filteredParticipants = useMemo(() => {
    let list = members
      .filter((m) => m.role !== "teacher")
      .filter((m) => m.user.username.toLowerCase().includes(ptSearch.toLowerCase()));
    list = [...list].sort((a, b) => {
      const diff = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      return ptSort === "asc" ? diff : -diff;
    });
    return list;
  }, [members, ptSearch, ptSort]);

  return (
    <Tabs value={activeTab} className="space-y-3">
      <div className="rounded-[30px] border bg-[var(--tint-sm)] p-2 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-200 dark:border-slate-800/60">
        <div>
          <h3 className="text-sm font-semibold p-2 text-slate-700">
            Workspace Sections
          </h3>
        </div>
        <div className="w-full sm:w-auto overflow-x-auto flex justify-start sm:justify-end scrollbar-none">
          <div
            className={cn(
              "h-[42px] rounded-full bg-white dark:bg-[#0d0e12] p-[2px] relative flex items-center gap-[2px] select-none cursor-pointer border border-black/5 dark:border-white/5 shrink-0 w-full sm:w-auto",
              canManage ? "sm:w-[384px]" : "sm:w-[260px]"
            )}
          >
            {/* Sliding Pill Indicator */}
            <div
              className={cn(
                "absolute rounded-full bg-[var(--tint-sm)] pointer-events-none h-[36px] top-[2px]",
                hasClicked && animationClass
              )}
              style={indicatorStyle}
            />

            <button
              type="button"
              onClick={() => handleTabClick("assignments")}
              className={cn(
                "relative z-10 flex h-[36px] flex-1 items-center justify-center text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
                activeTab === "assignments"
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Questions
            </button>

            <button
              type="button"
              onClick={() => handleTabClick("scoreboard")}
              className={cn(
                "relative z-10 flex h-[36px] flex-1 items-center justify-center text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
                activeTab === "scoreboard"
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Scoreboard
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => handleTabClick("participants")}
                className={cn(
                  "relative z-10 flex h-[36px] flex-1 items-center justify-center text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
                  activeTab === "participants"
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Participants
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <TabsContent value="assignments" className="mt-3 focus-visible:outline-none">
        <QuestionTable questions={questions} classroomId={classroomId} canManage={canManage} />
      </TabsContent>

      {/* ── Scoreboard ── */}
      <TabsContent value="scoreboard" className="mt-3 focus-visible:outline-none">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-[var(--tint-sm)] shadow-sm">
          {/* Toolbar */}
          <div className="p-2 flex items-center justify-between gap-3">
            <p className="pl-2 w-24 text-sm font-semibold text-slate-700">
              Scoreboard
            </p>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setSbSort((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="h-9 w-[150px] px-3 rounded-full font-regular bg-black dark:bg-white !text-white dark:!text-black hover:bg-zinc-900/90 dark:hover:bg-zinc-100/90 transition-colors"
            >
              <span>{sbSort === "desc" ? "High → Low" : "Low → High"}</span>
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--tint-sm)] border-slate-200 dark:border-slate-800/60">
                <TableHead className="w-12 pl-4">Rank</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="w-28 text-right">Solved</TableHead>
                <TableHead className="w-32 text-right pr-4">Total score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-400">
                    {sbSearch ? "No results match your search." : "No submissions yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaderboard.map((entry, index) => (
                  <TableRow
                    key={entry.userId}
                    className={cn(
                      "transition-colors",
                      index % 2 === 1 ? "bg-black/[0.02] dark:bg-white/[0.02]" : ""
                    )}
                  >
                    <TableCell className="tabular-nums text-slate-400 pl-4 font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {entry.username}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      {entry.solved}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-slate-900 pr-4">
                      {formatScore(entry.totalScore.toString())}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ── Participants ── */}
      {canManage && (
        <TabsContent value="participants" className="mt-3 focus-visible:outline-none">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 dark:border-slate-800/60 bg-[var(--tint-sm)] shadow-sm">
            {/* Toolbar */}
            <div className="p-2 flex items-center justify-between gap-3">
              <p className="pl-2 w-24 text-sm font-semibold text-slate-700">
                Participants
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setPtSort((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="h-9 w-[150px] px-3 rounded-full font-regular bg-black dark:bg-white !text-white dark:!text-black hover:bg-zinc-900/90 dark:hover:bg-zinc-100/90 transition-colors"
              >
                <span>{ptSort === "desc" ? "Newest → Oldest" : "Oldest → Newest"}</span>
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--tint-sm)] border-slate-200 dark:border-slate-800/60">
                  <TableHead className="pl-4">Username</TableHead>
                  <TableHead className="w-44 text-right pr-4">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-sm text-slate-400">
                      {ptSearch ? "No results match your search." : "No participants yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((member, index) => (
                    <TableRow
                      key={member.id}
                      className={cn(
                        "transition-colors",
                        index % 2 === 1 ? "bg-black/[0.02] dark:bg-white/[0.02]" : ""
                      )}
                    >
                      <TableCell className="font-medium pl-4 text-slate-900">
                        {member.user.username}
                      </TableCell>
                      <TableCell className="text-right text-slate-500 pr-4 whitespace-nowrap">
                        {formatDate(member.joinedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}
