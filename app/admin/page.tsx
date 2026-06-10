import Link from "next/link";

import { SubmissionTable } from "@/components/submissions/submission-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { listAdminQuestions } from "@/server/services/question-service";
import { listRecentSubmissionsForAdmin } from "@/server/services/submission-service";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [questions, submissions] = await Promise.all([listAdminQuestions(), listRecentSubmissionsForAdmin()]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Admin</h1>
          <p className="text-sm text-slate-500">Manage questions, testcases, and review recent submissions.</p>
        </div>
        <Button asChild>
          <Link href="/admin/questions/new">New question</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Total authored questions</CardDescription>
            <CardTitle>{questions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recent submissions</CardDescription>
            <CardTitle>{submissions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest submissions</CardTitle>
          <CardDescription>Most recent official attempts across all students.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionTable submissions={submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
