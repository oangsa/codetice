import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { CodeEditor } from "@/components/editor/code-editor";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { listSupportedLanguages } from "@/server/services/language-service";
import { getQuestionBySlug, listQuestionSubmissions } from "@/server/services/question-service";

export default async function QuestionDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ assignmentId?: string }>;
}) {
  const session = await requireUser();
  const { slug } = await props.params;
  const { assignmentId } = await props.searchParams;

  const question = await getQuestionBySlug(slug, session);
  if (!question) {
    notFound();
  }

  const [submissions, languages] = await Promise.all([
    listQuestionSubmissions(question.id, session.userId),
    listSupportedLanguages(),
  ]);
  const sampleCases = question.testcases.filter((testcase) => testcase.isSample);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Problem workspace"
        title={question.title}
        description="Review the statement, test with samples, then submit against the full judge."
        actions={
          <>
            <Badge variant="secondary">{question.difficulty}</Badge>
            <Badge variant="outline">{formatScore(question.totalScore)} points</Badge>
            <Link
              href="/questions"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </>
        }
      />

      <ResizablePanelGroup orientation="horizontal" className="min-h-[720px] gap-4">
        <ResizablePanel defaultSize={40} minSize={30}>
          <SurfaceCard title="Problem" className="h-full" contentClassName="h-[640px]">
            <Tabs defaultValue="description" className="h-full">
              <TabsList className="border border-slate-200 bg-slate-50">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="samples">Samples</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="h-[580px]">
                <ScrollArea className="h-full pr-4">
                  <Markdown>{question.description}</Markdown>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="samples" className="h-[580px]">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {sampleCases.map((testcase, index) => (
                      <div key={testcase.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sample {index + 1}
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Input</p>
                            <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">{testcase.input}</pre>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Expected output</p>
                            <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">{testcase.expectedOutput}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="submissions" className="h-[580px]">
                <ScrollArea className="h-full">
                  <SubmissionTable submissions={submissions} showQuestion={false} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </SurfaceCard>
        </ResizablePanel>
        <ResizableHandle className="w-px bg-slate-200" />
        <ResizablePanel defaultSize={60} minSize={40}>
          <CodeEditor
            questionId={question.id}
            assignmentId={assignmentId ?? null}
            starterCode={question.starterCode || "print('')"}
            starterCodeByLanguage={question.starterCodeByLanguage}
            languages={languages.map((language) => ({ slug: language.slug, name: language.name }))}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
