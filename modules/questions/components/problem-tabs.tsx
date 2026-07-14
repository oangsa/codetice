"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { QuestionSubmissionsPanel } from "@/modules/questions/components/question-submissions-panel";
import type { WorkspaceSubmissionListItem } from "@/modules/submissions/components/submission-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/common/button";
import { Markdown } from "@/components/ui/markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PagedResult } from "@/lib/pagination";
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
  initialSubmissionPage,
}: {
  workspaceId: string;
  questionId: string;
  description: string;
  sampleCases: SampleTestcase[];
  initialSubmissionPage: PagedResult<WorkspaceSubmissionListItem>;
}) {
  const [activeTab, setActiveTab] = useState<ProblemSection>("description");
  const tabs: ProblemSection[] = ["description", "samples", "submissions"];
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<ProblemSection, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const activeButton = tabRefs.current[activeTab];
    if (!activeButton) return;

    const nextIndicator = {
      left: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
    };
    setIndicator((current) => (
      current.left === nextIndicator.left && current.width === nextIndicator.width
        ? current
        : nextIndicator
    ));
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();

    const tabList = tabListRef.current;
    if (!tabList) return;

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(tabList);
    return () => resizeObserver.disconnect();
  }, [updateIndicator]);

  function selectTab(tab: ProblemSection) {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]">
      <CardHeader className="flex shrink-0 flex-row flex-wrap items-start justify-between gap-4 p-2">
        <div className="pl-2 pt-[9px]">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Problem</CardTitle>
        </div>
        <div className="scrollbar-none flex w-full justify-start overflow-x-auto sm:w-auto sm:justify-end">
          <div
            ref={tabListRef}
            className="relative flex h-[42px] w-max min-w-full shrink-0 cursor-pointer select-none items-center justify-center gap-[2px] rounded-full border border-black/5 bg-white p-[2px] dark:border-white/5 dark:bg-[#0d0e12] sm:min-w-0"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[2px] h-[36px] rounded-full bg-[var(--tint-sm)]"
              style={{
                left: indicator.left,
                width: indicator.width,
                opacity: indicator.width === 0 ? 0 : 1,
                transition: "left 0.25s cubic-bezier(0.25, 1, 0.5, 1), width 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            />
            {tabs.map((tab) => (
              <Button
                key={tab}
                ref={(element) => {
                  tabRefs.current[tab] = element;
                }}
                type="button"
                disableTooltip
                variant="ghost"
                size="sm"
                onClick={() => selectTab(tab)}
                className={cn(
                  "relative z-10 flex h-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent px-3 text-sm font-semibold capitalize hover:bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0",
                  activeTab === tab
                    ? "text-slate-950 hover:text-slate-950 dark:text-white dark:hover:text-white"
                    : "text-slate-500 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-400",
                )}
              >
                {tab}
              </Button>
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
            initialPage={initialSubmissionPage}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
