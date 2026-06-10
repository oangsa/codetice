import Link from "next/link";
import { Activity, CircleCheckBig, Gauge } from "lucide-react";

import { MetricCard } from "@/components/commons/metric-card";
import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { requireUser } from "@/lib/auth";
import { getQuestionStats, listQuestionsForUser } from "@/server/services/question-service";
import { listUserSubmissions } from "@/server/services/submission-service";
import { Button } from "@/components/ui/button";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { formatScore } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireUser();
  const [statsResult, questionsResult, submissionsResult] = await Promise.allSettled([
    getQuestionStats(session.userId),
    listQuestionsForUser(session),
    listUserSubmissions(session.userId),
  ]);
  const stats = statsResult.status === "fulfilled" ? statsResult.value : { solved: 0, totalScore: "0" };
  const questions = questionsResult.status === "fulfilled" ? questionsResult.value : [];
  const submissions = submissionsResult.status === "fulfilled" ? submissionsResult.value : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Track attempts, best scores, and recent grading activity."
        actions={
          <Button asChild className="border border-cyan-400/30 bg-cyan-400/12 text-cyan-50 hover:bg-cyan-400/20">
            <Link href="/questions">Browse questions</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total best score"
          value={formatScore(stats.totalScore)}
          hint="Summed from best results"
          icon={<Gauge className="h-4 w-4" />}
        />
        <MetricCard
          label="Solved questions"
          value={stats.solved}
          hint="Problems with recorded best scores"
          icon={<CircleCheckBig className="h-4 w-4" />}
        />
        <MetricCard
          label="Visible questions"
          value={questions.length}
          hint="Published problems in rotation"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <SurfaceCard title="Recent submissions" description="Your latest attempts across all published questions.">
        <SubmissionTable submissions={submissions.slice(0, 10)} />
      </SurfaceCard>
    </div>
  );
}
