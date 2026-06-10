import Link from "next/link";

import { CreateClassroomForm } from "@/components/classrooms/create-classroom-form";
import { JoinClassroomForm } from "@/components/classrooms/join-classroom-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listEnrolledClassrooms, listManagedClassrooms } from "@/server/services/classroom-service";

export default async function ClassroomsPage() {
  const session = await requireUser();
  const classrooms =
    session.role === "admin"
      ? await listManagedClassrooms(session.userId)
      : await listEnrolledClassrooms(session.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Classrooms</h1>
        <p className="text-sm text-slate-500">Join classrooms, review assignments, and coordinate question sets.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your classrooms</CardTitle>
            <CardDescription>Open a classroom to see members and assignments.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {classrooms.map((classroom) => (
              <Link
                key={classroom.id}
                href={`/classrooms/${classroom.id}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{classroom.name}</p>
                  {"inviteCode" in classroom ? (
                    <p className="text-xs text-slate-500">Invite code {classroom.inviteCode}</p>
                  ) : null}
                </div>
                <Badge variant="info">{classroom.members?.length ?? 0} members</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Join classroom</CardTitle>
            </CardHeader>
            <CardContent>
              <JoinClassroomForm />
            </CardContent>
          </Card>
          {session.role === "admin" ? (
            <Card>
              <CardHeader>
                <CardTitle>Create classroom</CardTitle>
              </CardHeader>
              <CardContent>
                <CreateClassroomForm />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
