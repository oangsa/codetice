import Link from "next/link";
import { FileCode2, Plus } from "lucide-react";

import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { listAdminQuestions } from "@/server/services/question-service";

export default async function AdminQuestionsPage() {
  await requireAdmin();
  const questions = await listAdminQuestions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Question Bank"
        description="Create, edit, and publish coding problems with full scoring metadata and testcase coverage."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              New question
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard title="Total Questions">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <FileCode2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{questions.length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Published and draft records</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard title="Published">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{questions.filter((question) => question.isPublished).length}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visible to student-facing workflows.</p>
        </SurfaceCard>
        <SurfaceCard title="Drafts">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{questions.filter((question) => !question.isPublished).length}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Awaiting testcase completion or publication.</p>
        </SurfaceCard>
      </div>

      <SurfaceCard title="Question Inventory" description="Operational view of question metadata and publication state.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell>{question.title}</TableCell>
                <TableCell>
                  <Badge variant="info">{question.difficulty}</Badge>
                </TableCell>
                <TableCell>{formatScore(question.totalScore)}</TableCell>
                <TableCell>
                  <Badge variant={question.isPublished ? "success" : "warning"}>
                    {question.isPublished ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/questions/${question.id}/edit`} className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SurfaceCard>
    </div>
  );
}
