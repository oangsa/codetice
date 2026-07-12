"use client";

import { useState, type CSSProperties } from "react";

import { QuestionSubmissionsPanel } from "@/modules/questions/components/question-submissions-panel";
import type { WorkspaceSubmissionListItem } from "@/modules/submissions/components/submission-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type SampleTestcase = {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
};

type ProblemSection = "description" | "samples" | "submissions";

export function ProblemTabs({
  workspaceId,
  questionId,
  description,
  sampleCases,
  initialSubmissions,
  initialHasMore,
  initialNextCursor,
}: {
  workspaceId: string;
  questionId: string;
  description: string;
  sampleCases: SampleTestcase[];
  initialSubmissions: WorkspaceSubmissionListItem[];
  initialHasMore: boolean;
  initialNextCursor: string | null;
}) {
  const [activeTab, setActiveTab] = useState<ProblemSection>("description");
  const [hasClicked, setHasClicked] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const tabs: ProblemSection[] = ["description", "samples", "submissions"];
  const activeIndex = tabs.indexOf(activeTab);
  const gap = 2;
  const totalGapWidth = (tabs.length - 1) * gap;

  const indicatorStyle = {
    left: `calc(2px + ((100% - 4px - ${totalGapWidth}px) / ${tabs.length} + ${gap}px) * ${activeIndex})`,
    width: `calc((100% - 4px - ${totalGapWidth}px) / ${tabs.length})`,
    "--active-width": `calc((100% - 4px - ${totalGapWidth}px) / ${tabs.length})`,
    transition: "left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  } as CSSProperties;

  function selectTab(tab: ProblemSection) {
    if (tab === activeTab) return;
    setHasClicked(true);
    setAnimationClass((current) => current === "animate-rubber-light" ? "animate-rubber-dark" : "animate-rubber-light");
    setActiveTab(tab);
  }

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]">
      <CardHeader className="flex shrink-0 flex-row flex-wrap items-start justify-between gap-4 p-2">
        <div className="pl-2 pt-[9px]">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Problem</CardTitle>
        </div>
        <div className="scrollbar-none flex w-full justify-start overflow-x-auto sm:w-auto sm:justify-end">
          <div className="relative flex h-[42px] w-full shrink-0 cursor-pointer select-none items-center gap-[2px] rounded-full border border-black/5 bg-white p-[2px] dark:border-white/5 dark:bg-[#0d0e12] sm:w-[320px]">
            <div
              className={cn(
                "pointer-events-none absolute top-[2px] h-[36px] rounded-full bg-[var(--tint-sm)]",
                hasClicked && animationClass,
              )}
              style={indicatorStyle}
            />
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                className={cn(
                  "relative z-10 flex h-[36px] flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-semibold capitalize transition-colors duration-200",
                  activeTab === tab
                    ? "text-slate-950 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-hidden py-2 pl-2 pr-2">
        {activeTab === "description" ? (
          <ScrollArea className="h-full min-h-0 pr-2">
            <Markdown className="py-3 pl-2 pr-2">{description}</Markdown>
          </ScrollArea>
        ) : null}

        {activeTab === "samples" ? (
          <ScrollArea className="h-full min-h-0 pr-2">
            <div className="space-y-4">
              {sampleCases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No sample testcases are available.
                </div>
              ) : sampleCases.map((testcase, index) => (
                <div key={testcase.id} className="rounded-lg border border-slate-200 bg-slate-100 p-4 dark:border-slate-800">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sample {index + 1}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Input</p>
                      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 dark:border-slate-800 bg-slate-800 p-3 text-sm text-slate-900">{testcase.input}</pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Expected output</p>
                      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 dark:border-slate-800 bg-slate-800 p-3 text-sm text-slate-900">{testcase.expectedOutput}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : null}

        {activeTab === "submissions" ? (
          <QuestionSubmissionsPanel
            workspaceId={workspaceId}
            questionId={questionId}
            initialSubmissions={initialSubmissions}
            initialHasMore={initialHasMore}
            initialNextCursor={initialNextCursor}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
