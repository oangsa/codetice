import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Info } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { InviteCodeSection } from "@/modules/workspaces/components/invite-code-section";
import { WorkspaceTabs } from "@/modules/workspaces/components/workspace-tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { requirePageUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { searchWorkspaceScoreboardPage } from "@/server/scoreboard/service";
import { searchWorkspaceQuestionsPage } from "@/server/questions/queries";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { getWorkspaceDetail, getWorkspaceMembership, searchWorkspaceMembersPage } from "@/server/workspaces/queries";

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser();
  const { id } = await params;
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.member) notFound();

  const [workspace, questionPage, scoreboardPage, memberPage, membership] = await Promise.all([
    getWorkspaceDetail(actor, id),
    searchWorkspaceQuestionsPage({
      actor,
      workspaceId: id,
      body: {
        limit: 10,
        search: [{ name: "isPublished", condition: "EQUAL", value: true }],
      },
    }),
    searchWorkspaceScoreboardPage({ actor, workspaceId: id, body: { limit: 10 } }),
    access.staff
      ? searchWorkspaceMembersPage({
          actor,
          workspaceId: id,
          body: { limit: 10, search: [{ name: "role", condition: "EQUAL", value: "student" }] },
        })
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
    getWorkspaceMembership(actor, id),
  ]);

  const questions = questionPage.items.map((question) => ({
    id: question.id,
    title: question.title,
    slug: question.slug,
    difficulty: question.difficulty,
    totalScore: question.totalScore,
    bestScore: question.bestScore,
    attempts: question.attempts,
    status: question.status,
    isPublished: question.isPublished,
  }));
  const totalQuestions = workspace.questionCount;
  const incompleteCount = Math.max(0, workspace.questionCount - workspace.solvedCount);

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/workspaces" className="hover:text-slate-900 dark:hover:text-white">Workspaces</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-slate-900 dark:text-white">{workspace.name}</span>
        </nav>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <PageHeader eyebrow="Workspace" title={workspace.name} />

          {access.staff ? (
            <div className="relative -top-[1px] shrink-0 py-4 pl-1 pr-4">
              <div className="flex items-start gap-5">
                {workspace.inviteCode ? (
                  <>
                    <div className="relative pr-6">
                      <p className="mb-1 text-[10px] font-semibold uppercase leading-4 tracking-wider text-slate-400">Invite code</p>
                      <p className="select-all text-xl font-bold leading-8 text-slate-900 dark:text-white">{workspace.inviteCode}</p>
                      <InviteCodeSection inviteCode={workspace.inviteCode} className="absolute right-0 top-[28px]" />
                    </div>
                    <div className="w-px self-stretch bg-slate-200 dark:bg-slate-800" />
                  </>
                ) : null}
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase leading-4 tracking-wider text-slate-400">Questions</p>
                  <p className="text-xl font-bold leading-8 text-slate-900 dark:text-white">{totalQuestions}</p>
                </div>
                {membership ? (
                  <>
                    <div className="w-px self-stretch bg-slate-200 dark:bg-slate-800" />
                    <JoinedInfo joinedAt={membership.joinedAt} />
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="relative -top-[1px] shrink-0 py-4 pl-1 pr-4">
              <div className="flex items-start gap-5">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase leading-4 tracking-wider text-slate-400">Total questions</p>
                  <p className="text-xl font-bold leading-8 text-slate-900 dark:text-white">{totalQuestions}</p>
                </div>
                <div className="w-px self-stretch bg-slate-200 dark:bg-slate-800" />
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase leading-4 tracking-wider text-slate-400">Incomplete</p>
                  <p className="text-xl font-bold leading-8 text-slate-900 dark:text-white">{incompleteCount}</p>
                </div>
                {membership ? (
                  <>
                    <div className="w-px self-stretch bg-slate-200 dark:bg-slate-800" />
                    <JoinedInfo joinedAt={membership.joinedAt} />
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <WorkspaceTabs
        questionPage={{ ...questionPage, items: questions }}
        scoreboardPage={scoreboardPage}
        memberPage={memberPage}
        workspaceId={id}
        canManage={access.staff}
      />
    </div>
  );
}

function JoinedInfo({ joinedAt }: { joinedAt: Date }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 select-none text-[10px] font-semibold uppercase leading-4 tracking-wider text-transparent">Info</p>
      <div className="flex h-8 items-center justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">Joined {formatDate(joinedAt)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
