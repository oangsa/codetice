import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeEditor } from "@/components/editor/code-editor";
import { SubmissionTable } from "@/components/submissions/submission-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { getQuestionBySlug, listQuestionSubmissions } from "@/server/services/question-service";

export default async function QuestionDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireUser();
  const { slug } = await props.params;

  const question = await getQuestionBySlug(slug, session);
  if (!question) {
    notFound();
  }

  const submissions = await listQuestionSubmissions(question.id, session.userId);
  const sampleCases = question.testcases.filter((testcase) => testcase.isSample);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{question.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="info">{question.difficulty}</Badge>
            <Badge variant="warning">{formatScore(question.totalScore)} points</Badge>
          </div>
        </div>
        <Link href="/questions" className="text-sm font-medium text-sky-700 hover:text-sky-800">
          Back to list
        </Link>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="min-h-[720px] gap-4">
        <ResizablePanel defaultSize={40} minSize={30}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Problem</CardTitle>
            </CardHeader>
            <CardContent className="h-[640px]">
              <Tabs defaultValue="description" className="h-full">
                <TabsList>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="samples">Samples</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                </TabsList>
                <TabsContent value="description" className="h-[580px]">
                  <ScrollArea className="h-full pr-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{question.description}</div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="samples" className="h-[580px]">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                      {sampleCases.map((testcase, index) => (
                        <Card key={testcase.id}>
                          <CardHeader>
                            <CardTitle className="text-sm">Sample {index + 1}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Input</p>
                              <pre className="rounded-md bg-slate-100 p-3 whitespace-pre-wrap">{testcase.input}</pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Expected output</p>
                              <pre className="rounded-md bg-slate-100 p-3 whitespace-pre-wrap">{testcase.expectedOutput}</pre>
                            </div>
                          </CardContent>
                        </Card>
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
            </CardContent>
          </Card>
        </ResizablePanel>
        <ResizableHandle className="w-px bg-slate-200" />
        <ResizablePanel defaultSize={60} minSize={40}>
          <CodeEditor questionId={question.id} starterCode={question.starterCode || "print('')"} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
