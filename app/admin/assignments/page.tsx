import { CreateAssignmentForm } from "@/components/assignments/create-assignment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { listAssignmentsForUser, listManagedClassrooms, listPublishedQuestions } from "@/server/services/classroom-service";

export default async function AdminAssignmentsPage() {
  const session = await requireAdmin();
  const [assignments, classrooms, questions] = await Promise.all([
    listAssignmentsForUser(session.userId, session.role),
    listManagedClassrooms(session.userId),
    listPublishedQuestions(),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create assignment</CardTitle>
          <CardDescription>Attach published questions to a workspace with schedule controls.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAssignmentForm classrooms={classrooms.map((item) => ({ id: item.id, name: item.name }))} questions={questions.map((item) => ({ id: item.id, title: item.title }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing assignments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-md border border-slate-200 px-4 py-3">
              <p className="font-medium text-slate-900">{assignment.title}</p>
              <p className="text-sm text-slate-500">{assignment.classroom?.name ?? "No workspace"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
