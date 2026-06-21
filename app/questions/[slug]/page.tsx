import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/commons/page-header";
import { CodeEditor } from "@/components/editor/code-editor";
import { ProblemTabs } from "@/components/questions/problem-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { requireUser } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { getClassroomById } from "@/server/services/classroom-service";
import { listSupportedLanguages } from "@/server/services/language-service";
import {
  canUserEditQuestion,
  getQuestionBySlug,
  listQuestionSubmissionsPage,
} from "@/server/services/question-service";

export default async function QuestionDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ assignmentId?: string; classroomId?: string }>;
}) {
  const session = await requireUser();
  const { slug } = await props.params;
  const { assignmentId, classroomId } = await props.searchParams;

  const question = await getQuestionBySlug(slug, session);
  if (!question) {
    notFound();
  }

  const [submissionPage, allLanguages, classroom] = await Promise.all([
    listQuestionSubmissionsPage(question.id, session.userId),
    listSupportedLanguages(),
    classroomId ? getClassroomById(classroomId) : Promise.resolve(null),
  ]);
  const sampleCases = question.testcases.filter((testcase) => testcase.isSample);

  let languages = question.allowedLanguages && question.allowedLanguages.length > 0
    ? allLanguages.filter((lang) => question.allowedLanguages!.includes(lang.slug))
    : allLanguages;

  if (languages.length === 0) {
    languages = allLanguages;
  }

  const backHref = classroomId ? `/classrooms/${classroomId}` : assignmentId ? "/assignments" : "/questions";
  const backLabel = classroomId ? "Workspace" : assignmentId ? "Assignments" : "Problems";

  const canEdit = canUserEditQuestion(session, question);

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-[560px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          {classroomId && classroom ? (
            <>
              <Link href="/classrooms" className="hover:text-slate-900">
                Workspaces
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={backHref} className="hover:text-slate-900">
                {classroom.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Link href={backHref} className="hover:text-slate-900">
                {backLabel}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="truncate text-slate-900">{question.title}</span>
        </nav>

        <PageHeader
          eyebrow="Problem workspace"
          title={question.title}
          actions={
            <>
              <Badge variant="secondary">{question.difficulty}</Badge>
              <Badge variant="outline">{formatScore(question.totalScore)} points</Badge>
              {canEdit && (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/admin/questions/${question.id}/edit?classroomId=${classroomId || ""}&backUrl=${encodeURIComponent(`/questions/${question.slug}${classroomId ? `?classroomId=${classroomId}` : ""}`)}`}>
                    Edit question
                  </Link>
                </Button>
              )}
            </>
          }
        />
      </div>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 gap-1">
        <ResizablePanel defaultSize={40} minSize={40} className="min-h-0 pr-1">
          <ProblemTabs
            questionId={question.id}
            description={question.description}
            sampleCases={sampleCases}
            initialSubmissions={submissionPage.submissions}
            initialHasMore={submissionPage.hasMore}
            initialNextOffset={submissionPage.nextOffset}
          />
        </ResizablePanel>
        <ResizableHandle className="relative bg-transparent after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:h-12 after:w-1 after:rounded-full after:bg-slate-500/20 hover:after:bg-slate-500/60 after:transition-colors" />
        <ResizablePanel defaultSize={60} minSize={40} className="min-h-0 pl-1">
          <CodeEditor
            questionId={question.id}
            assignmentId={assignmentId ?? null}
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
