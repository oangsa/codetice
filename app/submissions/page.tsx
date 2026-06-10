import { requireUser } from "@/lib/auth";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUserSubmissions } from "@/server/services/submission-service";

export default async function SubmissionsPage() {
  const session = await requireUser();
  const submissions = await listUserSubmissions(session.userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
        <CardDescription>All official attempts, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        <SubmissionTable submissions={submissions} />
      </CardContent>
    </Card>
  );
}
