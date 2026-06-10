import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { CodeEditor } from "@/components/editor/code-editor";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { Badge } from "@/components/ui/badge";
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
            <Badge variant="info" className="border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
              {question.difficulty}
            </Badge>
            <Badge variant="warning" className="border border-amber-300/15 bg-amber-400/10 text-amber-200">
              {formatScore(question.totalScore)} points
            </Badge>
            <Link href="/questions" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-cyan-200">
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
                <TabsList className="border border-white/8 bg-white/[0.04]">
                  <TabsTrigger value="description" className="text-slate-400 data-[state=active]:bg-white/8 data-[state=active]:text-white">Description</TabsTrigger>
                  <TabsTrigger value="samples" className="text-slate-400 data-[state=active]:bg-white/8 data-[state=active]:text-white">Samples</TabsTrigger>
                  <TabsTrigger value="submissions" className="text-slate-400 data-[state=active]:bg-white/8 data-[state=active]:text-white">Submissions</TabsTrigger>
                </TabsList>
                <TabsContent value="description" className="h-[580px]">
                  <ScrollArea className="h-full pr-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{question.description}</div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="samples" className="h-[580px]">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                      {sampleCases.map((testcase, index) => (
                        <SurfaceCard key={testcase.id} title={`Sample ${index + 1}`} className="bg-[#0b1324]/88" contentClassName="space-y-3 text-sm">
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Input</p>
                              <pre className="whitespace-pre-wrap rounded-md border border-white/8 bg-black/25 p-3 text-slate-200">{testcase.input}</pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Expected output</p>
                              <pre className="whitespace-pre-wrap rounded-md border border-white/8 bg-black/25 p-3 text-slate-200">{testcase.expectedOutput}</pre>
                            </div>
                        </SurfaceCard>
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
        <ResizableHandle className="w-px bg-white/10" />
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
