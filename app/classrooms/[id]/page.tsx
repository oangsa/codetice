import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ChevronRight, Info } from "lucide-react";

import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { ClassroomTabs } from "@/components/classrooms/classroom-tabs";
import { InviteCodeSection } from "@/components/classrooms/invite-code-section";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getClassroomById, getClassroomQuestionsForUser } from "@/server/services/classroom-service";
import { getClassroomLeaderboard } from "@/server/services/leaderboard-service";

export default async function ClassroomDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;

  const classroom = await getClassroomById(id);
  if (!classroom) notFound();

  const membership = classroom.members.find((m) => m.user.id === session.userId);
  const canManage = session.role === "admin" || membership?.role === "teacher";

  const [questionRows, leaderboard] = await Promise.all([
    getClassroomQuestionsForUser(id, session.userId, canManage),
    getClassroomLeaderboard(id),
  ]);

  const totalQuestions = questionRows.length;
  const incompleteCount = questionRows.filter((q) => q.status !== "accepted").length;

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link href="/classrooms" className="hover:text-slate-900">
            Workspaces
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-slate-900">{classroom.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <PageHeader
            eyebrow="Workspace"
            title={classroom.name}
          />

          {canManage ? (
            <div className="pl-1 pr-4 py-4 shrink-0 relative -top-[1px]">
              <div className="flex items-start gap-5">
                <div className="relative pr-6">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 leading-4">Invite code</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white leading-8 select-all">{classroom.inviteCode}</p>
                  <InviteCodeSection inviteCode={classroom.inviteCode} className="absolute right-0 top-[28px]" />
                </div>
                <div className="self-stretch w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 leading-4">Questions</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white leading-8">{totalQuestions}</p>
                </div>
                {membership && (
                  <>
                    <div className="self-stretch w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-transparent select-none mb-1 leading-4">Info</p>
                      <div className="h-8 flex items-center justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end">
                              <span>Joined {formatDate(membership.joinedAt)}</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="pl-1 pr-4 py-4 shrink-0 relative -top-[1px]">
              <div className="flex items-start gap-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 leading-4">Total questions</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white leading-8">{totalQuestions}</p>
                </div>
                <div className="self-stretch w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 leading-4">Incomplete</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white leading-8">{incompleteCount}</p>
                </div>
                {membership && (
                  <>
                    <div className="self-stretch w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-transparent select-none mb-1 leading-4">Info</p>
                      <div className="h-8 flex items-center justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end">
                              <span>Joined {formatDate(membership.joinedAt)}</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ClassroomTabs
        questions={questionRows}
        leaderboard={leaderboard}
        members={classroom.members}
        classroomId={id}
        canManage={canManage}
      />
    </div>
  );
}
