"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { SubmissionTable } from "@/components/submissions/submission-table";
import { ScrollArea } from "@/components/ui/scroll-area";

const PAGE_SIZE = 20;
const LOAD_MORE_THRESHOLD_PX = 240;

export type QuestionSubmissionListItem = {
  id: string;
  status: string;
  isLate: boolean;
  score: string;
  passedCount: number;
  totalCount: number;
  createdAt: string | Date;
};

type SubmissionPageResponse = {
  submissions: QuestionSubmissionListItem[];
  hasMore: boolean;
  nextOffset: number | null;
  message?: string;
};

export function QuestionSubmissionsPanel({
  questionId,
  initialSubmissions,
  initialHasMore,
  initialNextOffset,
}: {
  questionId: string;
  initialSubmissions: QuestionSubmissionListItem[];
  initialHasMore: boolean;
  initialNextOffset: number | null;
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || nextOffset === null) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      const response = await fetch(`/api/questions/${questionId}/submissions?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SubmissionPageResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load more submissions.");
      }

      startTransition(() => {
        setSubmissions((current) => {
          const existingIds = new Set(current.map((submission) => submission.id));
          const additions = payload.submissions.filter((submission) => !existingIds.has(submission.id));
          return additions.length > 0 ? [...current, ...additions] : current;
        });
      });
      setHasMore(payload.hasMore);
      setNextOffset(payload.nextOffset ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load more submissions.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextOffset, questionId]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");

    if (!(viewport instanceof HTMLDivElement)) {
      return;
    }

    const maybeLoadMore = () => {
      if (!hasMore || isLoadingMore) {
        return;
      }

      const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

      if (remaining <= LOAD_MORE_THRESHOLD_PX) {
        void loadMore();
      }
    };

    maybeLoadMore();
    viewport.addEventListener("scroll", maybeLoadMore);

    return () => {
      viewport.removeEventListener("scroll", maybeLoadMore);
    };
  }, [hasMore, isLoadingMore, loadMore, submissions.length]);

  return (
    <div className="h-full min-h-0">
      <ScrollArea ref={scrollAreaRef} className="h-full min-h-0 pr-2">
        {submissions.length > 0 ? (
          <SubmissionTable submissions={submissions} showQuestion={false} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No submissions yet. Your attempts will appear here.
          </div>
        )}

        {isLoadingMore ? (
          <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading more submissions...
          </div>
        ) : null}

        {loadError ? (
          <div className="px-4 py-3 text-center text-sm text-rose-600 dark:text-rose-400">
            {loadError}
          </div>
        ) : null}
      </ScrollArea>
    </div>
  );
}
