import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { QuestionForm } from "@/modules/questions/components/question-form";
import { requirePageUser } from "@/lib/auth";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { listEnabledLanguageOptions } from "@/server/languages/service";
import { getWorkspaceQuestionById } from "@/server/questions/queries";

export default async function EditWorkspaceQuestionPage({ params }: { params: Promise<{ id: string; questionId: string }> }) {
  const actor = await requirePageUser();
  const { id: workspaceId, questionId } = await params;
  const access = await getWorkspaceAccess(actor, workspaceId);
  if (!access?.staff) notFound();
  const [question, languages] = await Promise.all([
    getWorkspaceQuestionById(workspaceId, questionId),
    listEnabledLanguageOptions(),
  ]);
  if (!question) notFound();
  return (
    <div className="space-y-6">
      <Link href={`/workspaces/${workspaceId}/questions/${question.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back to question</Link>
      <QuestionForm mode="edit" workspaceId={workspaceId} question={question} backUrl={`/workspaces/${workspaceId}/questions/${question.slug}`} languages={languages} />
    </div>
  );
}
