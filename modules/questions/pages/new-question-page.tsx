import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { QuestionForm } from "@/modules/questions/components/question-form";
import { requirePageUser } from "@/lib/auth";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { getWorkspaceDetail } from "@/server/workspaces/queries";
import { listEnabledLanguageOptions } from "@/server/languages/service";

export default async function NewWorkspaceQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser();
  const { id } = await params;
  const access = await getWorkspaceAccess(actor, id);
  if (!access?.staff) notFound();
  const [workspace, languages] = await Promise.all([getWorkspaceDetail(actor, id), listEnabledLanguageOptions()]);
  return (
    <div className="space-y-6">
      <Link href={`/workspaces/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back to {workspace.name}</Link>
      <QuestionForm mode="create" workspaceId={id} backUrl={`/workspaces/${id}`} languages={languages} />
    </div>
  );
}
