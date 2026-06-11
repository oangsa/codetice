import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { ClassroomCard } from "@/components/classrooms/classroom-card";
import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { JoinClassroomForm } from "@/components/classrooms/join-classroom-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requireUser } from "@/lib/auth";
import { listClassroomsWithStats } from "@/server/services/classroom-service";

export default async function ClassroomsDashboardPage() {
  const session = await requireUser();
  const classrooms = await listClassroomsWithStats(session.userId, session.role);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Classrooms"
        description="Review active classrooms, open a teaching workspace, or join a class with an invite code."
        actions={
          <>
            {session.role === "admin" ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">Admin</Link>
              </Button>
            ) : null}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Join classroom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a classroom</DialogTitle>
                </DialogHeader>
                <JoinClassroomForm />
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <SurfaceCard
        title="Workspace Directory"
        description={`${classrooms.length} classroom${classrooms.length === 1 ? "" : "s"} available in your account.`}
      >
        {classrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600">No classrooms yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Join a classroom with an invite code to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classrooms.map((classroom) => (
              <ClassroomCard key={classroom.id} classroom={classroom} />
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
