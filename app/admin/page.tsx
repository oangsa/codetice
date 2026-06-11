import Link from "next/link";
import { ClipboardList, FileCode2 } from "lucide-react";

import { MetricCard } from "@/components/commons/metric-card";
import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { listAdminQuestions } from "@/server/services/question-service";
import { listRecentSubmissionsForAdmin } from "@/server/services/submission-service";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [questions, submissions] = await Promise.all([listAdminQuestions(), listRecentSubmissionsForAdmin()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Control Room"
        description="Review inventory, monitor grading traffic, and maintain the question bank from one operational workspace."
        actions={
          <Button asChild>
          <Link href="/admin/questions/new">New question</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Total authored questions" value={questions.length} hint="Published and draft inventory" icon={<FileCode2 className="h-4 w-4" />} />
        <MetricCard label="Recent submissions" value={submissions.length} hint="Latest official attempts" icon={<ClipboardList className="h-4 w-4" />} />
      </div>

      <SurfaceCard title="Latest Submissions" description="Most recent official attempts across all students.">
          <SubmissionTable submissions={submissions} />
      </SurfaceCard>
    </div>
  );
}
