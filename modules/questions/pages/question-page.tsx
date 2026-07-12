import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CodeEditor } from "@/modules/questions/editor/code-editor";
import { ProblemTabs } from "@/modules/questions/components/problem-tabs";
import { WorkspaceRejudgeButton } from "@/modules/submissions/components/workspace-rejudge-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { requirePageUser } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { listSupportedLanguages } from "@/server/languages/service";
import { getWorkspaceQuestionBySlug } from "@/server/questions/queries";
import { listWorkspaceSubmissionsPage } from "@/server/submissions/queries";
import { getWorkspaceAccess } from "@/server/workspaces/authorization";
import { getWorkspaceDetail } from "@/server/workspaces/queries";

export default async function WorkspaceQuestionPage({
  params,
}: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const actor = await requirePageUser();
  const { id: workspaceId, questionId: slug } = await params;
  const access = await getWorkspaceAccess(actor, workspaceId);
  if (!access?.member) notFound();

  const [question, allLanguages, workspace] = await Promise.all([
    getWorkspaceQuestionBySlug({ actor, workspaceId, slug }),
    listSupportedLanguages(),
    getWorkspaceDetail(actor, workspaceId),
  ]);
  if (!question) notFound();

  const submissionPage = await listWorkspaceSubmissionsPage({
    actor,
    workspaceId,
    questionId: question.id,
    studentId: null,
    limit: 24,
    cursor: null,
  });
  const sampleCases = question.testcases.filter((testcase) => testcase.isSample);
  const languages = question.allowedLanguages.length > 0
    ? allLanguages.filter((language) => question.allowedLanguages.includes(language.slug))
    : allLanguages;

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-[560px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <nav className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/workspaces" className="hover:text-slate-900 dark:hover:text-white">Workspaces</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/workspaces/${workspaceId}`} className="hover:text-slate-900 dark:hover:text-white">{workspace.name}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-slate-900 dark:text-white">{question.title}</span>
        </nav>

        <PageHeader
          eyebrow="Problem workspace"
          title={question.title}
          actions={
            <>
              <Badge variant="secondary">{question.difficulty}</Badge>
              <Badge variant="outline">{formatScore(question.totalScore)} points</Badge>
              {access.staff ? (
                <>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/workspaces/${workspaceId}/questions/${question.id}/edit`}>Edit question</Link>
                  </Button>
                  <WorkspaceRejudgeButton workspaceId={workspaceId} target={{ kind: "question", id: question.id }} />
                </>
              ) : null}
            </>
          }
        />
      </div>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 gap-1">
        <ResizablePanel defaultSize={40} minSize={40} className="min-h-0 pr-1">
          <ProblemTabs
            workspaceId={workspaceId}
            questionId={question.id}
            description={question.description}
            sampleCases={sampleCases}
            initialSubmissions={submissionPage.items}
            initialHasMore={submissionPage.hasMore}
            initialNextCursor={submissionPage.nextCursor}
          />
        </ResizablePanel>
        <ResizableHandle className="relative bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-12 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-slate-500/20 after:transition-colors hover:after:bg-slate-500/60" />
        <ResizablePanel defaultSize={60} minSize={40} className="min-h-0 pl-1">
          <CodeEditor
            workspaceId={workspaceId}
            questionId={question.id}
            starterCode={question.starterCode ?? ""}
            starterCodeByLanguage={question.starterCodeByLanguage}
            languages={languages.map((language) => ({
              slug: language.slug,
              name: language.name,
              editorLanguage: language.editorLanguage,
              defaultStarterCode: language.defaultStarterCode,
            }))}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
