"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { SubmissionTable, type WorkspaceSubmissionListItem } from "@/modules/submissions/components/submission-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Messages } from "@/lib/api.constants";

const pageSize = 24;
const loadMoreThreshold = 240;

type SubmissionPage = {
  items: WorkspaceSubmissionListItem[];
  hasMore: boolean;
  nextCursor: string | null;
  message?: string;
};

export function QuestionSubmissionsPanel({
  workspaceId,
  questionId,
  initialSubmissions,
  initialHasMore,
  initialNextCursor,
}: {
  workspaceId: string;
  questionId: string;
  initialSubmissions: WorkspaceSubmissionListItem[];
  initialHasMore: boolean;
  initialNextCursor: string | null;
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const searchParams = new URLSearchParams({
        questionId,
        limit: String(pageSize),
        cursor: nextCursor,
      });
      const response = await fetch(`/api/workspaces/${workspaceId}/submissions?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json() as SubmissionPage;
      if (!response.ok) throw new Error(payload.message ?? Messages.somethingWrong);

      startTransition(() => {
        setSubmissions((current) => {
          const existingIds = new Set(current.map((submission) => submission.id));
          const additions = payload.items.filter((submission) => !existingIds.has(submission.id));
          return additions.length > 0 ? [...current, ...additions] : current;
        });
      });
      setHasMore(payload.hasMore);
      setNextCursor(payload.nextCursor);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : Messages.somethingWrong);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor, questionId, workspaceId]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (!(viewport instanceof HTMLDivElement)) return;

    const maybeLoadMore = () => {
      if (!hasMore || isLoadingMore) return;
      const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (remaining <= loadMoreThreshold) void loadMore();
    };

    maybeLoadMore();
    viewport.addEventListener("scroll", maybeLoadMore);
    return () => viewport.removeEventListener("scroll", maybeLoadMore);
  }, [hasMore, isLoadingMore, loadMore, submissions.length]);

  return (
    <div className="min-h-0">
      <ScrollArea ref={scrollAreaRef} className="h-[37rem] max-h-[90vh] min-h-0 pr-2">
        {submissions.length > 0 ? (
          <SubmissionTable workspaceId={workspaceId} submissions={submissions} showQuestion={false} />
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
        {loadError ? <div className="px-4 py-3 text-center text-sm text-rose-600 dark:text-rose-400">{loadError}</div> : null}
      </ScrollArea>
    </div>
  );
}
