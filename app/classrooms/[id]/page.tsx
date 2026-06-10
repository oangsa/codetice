import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getClassroomById } from "@/server/services/classroom-service";
import { formatDate } from "@/lib/utils";

export default async function ClassroomDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await props.params;
  const classroom = await getClassroomById(id);

  if (!classroom) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{classroom.name}</CardTitle>
          <CardDescription>Invite code {classroom.inviteCode}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {classroom.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
                <span>{member.user.username}</span>
                <Badge variant="info">{member.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {classroom.assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-md border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{assignment.title}</span>
                  {assignment.dueAt ? <Badge variant="warning">Due {formatDate(assignment.dueAt)}</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{assignment.description ?? "No description."}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
