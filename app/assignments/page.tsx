import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listAssignmentsForUser } from "@/server/services/classroom-service";
import { formatDate } from "@/lib/utils";

export default async function AssignmentsPage() {
  const session = await requireUser();
  const assignments = await listAssignmentsForUser(session.userId, session.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Assignments</h1>
          <p className="text-sm text-slate-500">Track workspace-specific question sets and due dates.</p>
        </div>
        {session.role === "admin" ? (
          <Button asChild>
            <Link href="/admin/assignments">Manage assignments</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{assignment.title}</CardTitle>
                  <CardDescription>{assignment.classroom?.name ?? "No workspace"}</CardDescription>
                </div>
                {assignment.dueAt ? <Badge variant="secondary">Due {formatDate(assignment.dueAt)}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{assignment.description ?? "No description."}</p>
              <div className="flex flex-wrap gap-2">
                {assignment.assignmentQuestions.map((item) => (
                  <Link
                    key={item.id}
                    href={`/questions/${item.question.slug}?assignmentId=${assignment.id}`}
                    className="rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
                  >
                    {item.question.title}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
