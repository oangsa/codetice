import Link from "next/link";
import { BookOpen } from "lucide-react";

import { ClassroomCard } from "@/components/classrooms/classroom-card";
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

export default async function DashboardPage() {
  const session = await requireUser();
  const classrooms = await listClassroomsWithStats(session.userId, session.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your enrolled classrooms and workspaces.</p>
        </div>
        <div className="flex items-center gap-2">
          {session.role === "admin" ? (
            <Button asChild variant="secondary">
              <Link href="/admin">Admin panel</Link>
            </Button>
          ) : null}
          <Dialog>
            <DialogTrigger asChild>
              <Button>+ Join</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a classroom</DialogTitle>
              </DialogHeader>
              <JoinClassroomForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Classrooms */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Workspaces{" "}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            {classrooms.length}
          </span>
        </h2>
        {classrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600">No classrooms yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Join a classroom with an invite code to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {classrooms.map((classroom) => (
              <ClassroomCard key={classroom.id} classroom={classroom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
