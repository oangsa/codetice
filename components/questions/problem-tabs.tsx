"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/ui/markdown";
import { QuestionSubmissionsPanel, type QuestionSubmissionListItem } from "@/components/questions/question-submissions-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Testcase = {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
};

export function ProblemTabs({
  questionId,
  description,
  sampleCases,
  initialSubmissions,
  initialHasMore,
  initialNextOffset,
}: {
  questionId: string;
  description: string;
  sampleCases: Testcase[];
  initialSubmissions: QuestionSubmissionListItem[];
  initialHasMore: boolean;
  initialNextOffset: number | null;
}) {
  const [activeTab, setActiveTab] = useState<"description" | "samples" | "submissions">(
    "description"
  );
  const [hasClicked, setHasClicked] = useState(false);
  const [animationClass, setAnimationClass] = useState("");

  const tabs = ["description", "samples", "submissions"] as const;
  const activeIndex = tabs.indexOf(activeTab);
  const N = 3;
  const G = 2; // Spacing/gap between tabs
  const totalGapWidth = (N - 1) * G;

  const handleTabClick = (tab: "description" | "samples" | "submissions") => {
    if (tab === activeTab) return;
    setHasClicked(true);
    setAnimationClass((prev) =>
      prev === "animate-rubber-light" ? "animate-rubber-dark" : "animate-rubber-light"
    );
    setActiveTab(tab);
  };

  const indicatorStyle = {
    left: `calc(2px + ((100% - 4px - ${totalGapWidth}px) / ${N} + ${G}px) * ${activeIndex})`,
    width: `calc((100% - 4px - ${totalGapWidth}px) / ${N})`,
    "--active-width": `calc((100% - 4px - ${totalGapWidth}px) / ${N})`,
    transition: "left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  } as React.CSSProperties;

  return (
    <Card className="rounded-[30px] h-full flex flex-col">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-2">
        <div className="pl-2 pt-[9px]">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Problem</CardTitle>
        </div>
        <div className="w-full sm:w-auto overflow-x-auto flex justify-start sm:justify-end scrollbar-none">
          <div className="h-[42px] w-full sm:w-[320px] rounded-full bg-white dark:bg-[#0d0e12] p-[2px] relative flex items-center gap-[2px] select-none cursor-pointer border border-black/5 dark:border-white/5 shrink-0">
            {/* Squeezing and Sliding Pill Indicator */}
            <div
              className={cn(
                "absolute rounded-full bg-[var(--tint-sm)] pointer-events-none h-[36px] top-[2px]",
                hasClicked && animationClass
              )}
              style={indicatorStyle}
            />

            <button
              type="button"
              onClick={() => handleTabClick("description")}
              className={cn(
                "relative z-10 flex h-[36px] flex-1 items-center justify-center text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
                activeTab === "description"
                  ? "text-slate-955 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Description
            </button>

            <button
              type="button"
              onClick={() => handleTabClick("samples")}
              className={cn(
                "relative z-10 flex h-[36px] flex-1 items-center justify-center text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
                activeTab === "samples"
                  ? "text-slate-955 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Samples
            </button>

            <button
              type="button"
              onClick={() => handleTabClick("submissions")}
              className={cn(
                "relative z-10 flex h-[36px] flex-1 items-center justify-center text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
                activeTab === "submissions"
                  ? "text-slate-955 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Submissions
            </button>
          </div>
        </div>
      </CardHeader>


      {/* Tabs Content */}
      <CardContent className="py-2 pl-2 pr-2 flex-1 min-h-0">
        {activeTab === "description" && (
          <ScrollArea className="h-full pr-2">
            <Markdown className="py-3 pl-2 pr-2">{description}</Markdown>
          </ScrollArea>
        )}

        {activeTab === "samples" && (
          <ScrollArea className="h-full pr-2">
            <div className="space-y-4">
              {sampleCases.map((testcase, index) => (
                <div
                  key={testcase.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 p-4"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Sample {index + 1}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Input
                      </p>
                      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 dark:border-slate-800 bg-slate-800 p-3 text-sm text-slate-900">
                        {testcase.input}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Expected output
                      </p>
                      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 dark:border-slate-800 bg-slate-800 p-3 text-sm text-slate-900">
                        {testcase.expectedOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {activeTab === "submissions" && (
          <QuestionSubmissionsPanel
            questionId={questionId}
            initialSubmissions={initialSubmissions}
            initialHasMore={initialHasMore}
            initialNextOffset={initialNextOffset}
          />
        )}
      </CardContent>
    </Card>
  );
}
