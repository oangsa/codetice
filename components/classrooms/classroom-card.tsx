import Link from "next/link";
import { Users, BookOpen } from "lucide-react";

import { Progress } from "@/components/ui/progress";

export function ClassroomCard({
  classroom,
}: {
  classroom: {
    id: string;
    name: string;
    creatorName: string;
    memberCount: number;
    questionCount: number;
    solvedCount: number;
    progressPercent: number;
  };
}) {
  return (
    <Link
      href={`/classrooms/${classroom.id}`}
      className="group block rounded-[30px] border bg-card p-6 text-card-foreground shadow-sm transition-all duration-300 ease-in-out hover:bg-[#dcdce3] dark:hover:bg-slate-900/20"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-white">
          {classroom.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">TA {classroom.creatorName}</p>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {classroom.memberCount}
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          {classroom.questionCount}
        </span>
        <span className="ml-auto font-medium text-slate-700 dark:text-slate-300">{classroom.progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <Progress value={classroom.progressPercent} className="mt-2 h-1.5" />
    </Link>
  );
}

