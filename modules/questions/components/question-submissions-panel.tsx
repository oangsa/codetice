"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { SubmissionTable, type WorkspaceSubmissionListItem } from "@/modules/submissions/components/submission-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Messages } from "@/lib/api.constants";
import { parsePaginationMeta, type PagedResult } from "@/lib/pagination";

const loadMoreThreshold = 240;

export function QuestionSubmissionsPanel({
  workspaceId,
  questionId,
  initialPage,
}: {
  workspaceId: string;
  questionId: string;
  initialPage: PagedResult<WorkspaceSubmissionListItem>;
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [submissions, setSubmissions] = useState(initialPage.items);
  const [meta, setMeta] = useState(initialPage.meta);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !meta.hasNext) return;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const searchParams = new URLSearchParams({
        questionId,
        pageNumber: String(meta.currentPage + 1),
        pageSize: String(meta.pageSize),
      });
      const response = await fetch(`/api/workspaces/${workspaceId}/submissions?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json() as WorkspaceSubmissionListItem[] | { message?: string };
      if (!response.ok) {
        const message = typeof payload === "object" && !Array.isArray(payload) ? payload.message : undefined;
        throw new Error(message ?? Messages.somethingWrong);
      }
      const nextMeta = parsePaginationMeta(response.headers.get("X-Pagination"));
      if (!Array.isArray(payload) || !nextMeta) throw new Error(Messages.somethingWrong);

      startTransition(() => {
        setSubmissions((current) => {
          const existingIds = new Set(current.map((submission) => submission.id));
          const additions = payload.filter((submission) => !existingIds.has(submission.id));
          return additions.length > 0 ? [...current, ...additions] : current;
        });
      });
      setMeta(nextMeta);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : Messages.somethingWrong);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, meta, questionId, workspaceId]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (!(viewport instanceof HTMLDivElement)) return;

    const maybeLoadMore = () => {
      if (!meta.hasNext || isLoadingMore) return;
      const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (remaining <= loadMoreThreshold) void loadMore();
    };

    maybeLoadMore();
    viewport.addEventListener("scroll", maybeLoadMore);
    return () => viewport.removeEventListener("scroll", maybeLoadMore);
  }, [isLoadingMore, loadMore, meta.hasNext, submissions.length]);

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
