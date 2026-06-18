import Link from "next/link";
import { BookOpen } from "lucide-react";

import { ClassroomCard } from "@/components/classrooms/classroom-card";
import { CreateClassroomForm } from "@/components/classrooms/create-classroom-form";
import { PageHeader } from "@/components/commons/page-header";
import { JoinClassroomForm } from "@/components/classrooms/join-classroom-form";
import { requireUser } from "@/lib/auth";
import { listClassroomsWithStats } from "@/server/services/classroom-service";

export default async function ClassroomsDashboardPage() {
  const session = await requireUser();
  const classrooms = await listClassroomsWithStats(session.userId, session.role);
  const isAdmin = session.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <div className="h-5 mb-3" />
        <PageHeader
          eyebrow="Overview"
          title="Workspaces"
          description="Review active workspaces, open a teaching workspace, or join a workspace with an invite code."
          actions={isAdmin ? <CreateClassroomForm /> : <JoinClassroomForm />}
        />
      </div>

      {classrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No workspaces yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Join a workspace with an invite code to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom) => (
            <ClassroomCard key={classroom.id} classroom={classroom} />
          ))}
        </div>
      )}
    </div>
  );
}
