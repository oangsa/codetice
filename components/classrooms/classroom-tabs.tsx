"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, formatDate, formatScore } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SurfaceCard } from "@/components/commons/surface-card";
import { QuestionTable } from "@/components/classrooms/question-table";
import { Tabs, TabsContent } from "@/components/ui/tabs";

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

  const tabs = canManage
    ? ["assignments", "scoreboard", "participants"]
    : ["assignments", "scoreboard"];

  const activeIndex = tabs.indexOf(activeTab);
  const N = canManage ? 3 : 2;
  const G = 2; // Spacing/gap between tabs
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

  return (
    <Tabs value={activeTab} className="space-y-3">
      <div className="rounded-[30px] border bg-[var(--tint-sm)] p-2 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-200 dark:border-slate-800/60">
        <div>
          <h3 className="text-sm font-semibold p-2 text-slate-700 dark:text-slate-300">
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
            {/* Squeezing and Sliding Pill Indicator */}
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
                Participant
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <TabsContent value="assignments" className="mt-3 focus-visible:outline-none">
        <QuestionTable questions={questions} classroomId={classroomId} canManage={canManage} />
      </TabsContent>

      <TabsContent value="scoreboard" className="mt-3 focus-visible:outline-none">
        <SurfaceCard title="Workspace Leaderboard" description="Best recorded score totals for members of this workspace.">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                <TableHead className="w-12 pl-4">Rank</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-28 text-right">Solved</TableHead>
                <TableHead className="w-32 text-right">Total score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((entry, index) => (
                  <TableRow
                    key={entry.userId}
                    className={cn(
                      "transition-colors",
                      index % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/10" : "bg-card"
                    )}
                  >
                    <TableCell className="font-medium tabular-nums text-slate-500 pl-4">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{entry.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.role === "teacher" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {entry.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {entry.solved}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatScore(entry.totalScore.toString())}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </SurfaceCard>
      </TabsContent>

      {canManage && (
        <TabsContent value="participants" className="mt-3 focus-visible:outline-none">
          <SurfaceCard title="Participants" description="Members currently attached to this workspace.">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800 hover:bg-slate-800">
                  <TableHead className="pl-4">Username</TableHead>
                  <TableHead className="w-24">Role</TableHead>
                  <TableHead className="w-40">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member, index) => (
                  <TableRow
                    key={member.id}
                    className={cn(
                      "transition-colors",
                      index % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/10" : "bg-card"
                    )}
                  >
                    <TableCell className="font-medium pl-4">{member.user.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === "teacher" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{formatDate(member.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SurfaceCard>
        </TabsContent>
      )}
    </Tabs>
  );
}
