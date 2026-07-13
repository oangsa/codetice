import Link from "next/link";
import { BookOpen, Users } from "lucide-react";

import { Progress } from "@/components/ui/progress";

export function WorkspaceCard({
  workspace,
}: {
  workspace: {
    id: string;
    name: string;
    ownerName: string;
    memberCount: number;
    questionCount: number;
    solvedCount: number;
    progressPercent: number;
  };
}) {
  return (
    <Link
      href={`/workspaces/${workspace.id}`}
      className="group block rounded-[30px] border bg-card p-6 text-card-foreground shadow-sm transition-all duration-300 ease-in-out hover:bg-[#dcdce3] dark:hover:bg-slate-900/20"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-white">{workspace.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">Owner {workspace.ownerName}</p>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{workspace.memberCount}</span>
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{workspace.questionCount}</span>
        <span className="ml-auto font-medium text-slate-700 dark:text-slate-300">{workspace.progressPercent}%</span>
      </div>

      <Progress value={workspace.progressPercent} className="mt-2 h-1.5" />
    </Link>
  );
}
