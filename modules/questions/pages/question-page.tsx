import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { CodeEditor } from "@/modules/questions/editor/code-editor";
import { ProblemTabs } from "@/modules/questions/components/problem-tabs";
import { WorkspaceRejudgeButton } from "@/modules/submissions/components/workspace-rejudge-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/common/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { requirePageUser } from "@/lib/auth";
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
    pageNumber: 1,
    pageSize: 24,
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

        <div className="px-1 py-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{question.title}</h1>
                <Badge variant="secondary" className="h-5 self-center rounded-full px-2.5 py-0 text-[10px] font-semibold uppercase leading-none tracking-wide">
                  {question.difficulty}
                </Badge>
              </div>
              {question.tags.length > 0 ? (
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  tag: {question.tags.map((tag) => tag.name).join(", ")}
                </p>
              ) : null}
            </div>
            {access.staff ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/workspaces/${workspaceId}/questions/${question.id}/edit`}>Edit question</Link>
                </Button>
                <WorkspaceRejudgeButton workspaceId={workspaceId} target={{ kind: "question", id: question.id }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 gap-1">
        <ResizablePanel defaultSize={40} minSize={40} className="min-h-0 pr-1">
          <ProblemTabs
            workspaceId={workspaceId}
            questionId={question.id}
            description={question.description}
            sampleCases={sampleCases}
            initialSubmissionPage={submissionPage}
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
