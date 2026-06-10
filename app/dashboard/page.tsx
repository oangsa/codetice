import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getQuestionStats, listQuestionsForUser } from "@/server/services/question-service";
import { listUserSubmissions } from "@/server/services/submission-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { formatScore } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireUser();
  const [stats, questions, submissions] = await Promise.all([
    getQuestionStats(session.userId),
    listQuestionsForUser(session),
    listUserSubmissions(session.userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-500">Track attempts, best scores, and recent grading activity.</p>
        </div>
        <Button asChild>
          <Link href="/questions">Browse questions</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total best score</CardDescription>
            <CardTitle>{formatScore(stats.totalScore)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Solved questions</CardDescription>
            <CardTitle>{stats.solved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Visible questions</CardDescription>
            <CardTitle>{questions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent submissions</CardTitle>
          <CardDescription>Your latest attempts across all published questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionTable submissions={submissions.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
}
