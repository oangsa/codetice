"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_PAGE_SIZE,
  parsePaginationMeta,
  type PagedResult,
} from "@/lib/pagination";

export type ClientPagedResult<T> = PagedResult<T>;

export function useCollectionSearch<T>(input: {
  endpoint: string;
  initialPage: ClientPagedResult<T>;
  initialRequest?: Record<string, unknown>;
  request: Record<string, unknown>;
  debounceMs?: number;
}) {
  const requestKey = useMemo(() => JSON.stringify(input.request), [input.request]);
  const initialKey = useRef(JSON.stringify(input.initialRequest ?? input.request));
  const [page, setPage] = useState(input.initialPage);
  const [navigation, setNavigation] = useState<{ key: string; pageNumber: number; pageSize: number }>({
    key: requestKey,
    pageNumber: input.initialPage.meta.currentPage,
    pageSize: input.initialPage.meta.pageSize,
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const requestChanged = navigation.key !== requestKey;

  if (requestChanged) {
    setNavigation({
      key: requestKey,
      pageNumber: 1,
      pageSize: navigation.pageSize || input.initialPage.meta.pageSize || DEFAULT_PAGE_SIZE,
    });
  }

  const activeNavigation = !requestChanged
    ? navigation
    : {
        key: requestKey,
        pageNumber: 1,
        pageSize: navigation.pageSize || input.initialPage.meta.pageSize || DEFAULT_PAGE_SIZE,
      };

  useEffect(() => {
    if (
      requestKey === initialKey.current
      && activeNavigation.pageNumber === input.initialPage.meta.currentPage
      && activeNavigation.pageSize === input.initialPage.meta.pageSize
      && reloadVersion === 0
    ) {
      setPage(input.initialPage);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const currentSequence = ++sequence.current;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(input.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input.request,
            pageNumber: activeNavigation.pageNumber,
            pageSize: activeNavigation.pageSize,
          }),
          signal: controller.signal,
        });
        const payload = await response.json() as T[] | { message?: string };
        if (!response.ok) {
          const message = typeof payload === "object" && !Array.isArray(payload) ? payload.message : undefined;
          throw new Error(message ?? "Unable to load records.");
        }
        const meta = parsePaginationMeta(response.headers.get("X-Pagination"));
        if (!Array.isArray(payload) || !meta) {
          throw new Error("The server returned an invalid pagination response.");
        }
        if (currentSequence === sequence.current) setPage({ items: payload, meta });
      } catch (caught) {
        if (!controller.signal.aborted && currentSequence === sequence.current) {
          setError(caught instanceof Error ? caught.message : "Unable to load records.");
        }
      } finally {
        if (currentSequence === sequence.current) setIsLoading(false);
      }
    }, input.debounceMs ?? 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    activeNavigation.pageNumber,
    activeNavigation.pageSize,
    input.debounceMs,
    input.endpoint,
    input.initialPage,
    input.request,
    reloadVersion,
    requestKey,
  ]);

  const goToPage = useCallback((pageNumber: number) => {
    const totalPages = page.meta.totalPages;
    const normalized = Math.max(1, Math.min(pageNumber, Math.max(totalPages, 1)));
    if (normalized === activeNavigation.pageNumber) return;
    setNavigation((current) => ({ ...current, key: requestKey, pageNumber: normalized }));
  }, [activeNavigation.pageNumber, page.meta.totalPages, requestKey]);

  const setPageSize = useCallback((pageSize: number) => {
    if (pageSize === activeNavigation.pageSize) return;
    setNavigation({ key: requestKey, pageNumber: 1, pageSize });
  }, [activeNavigation.pageSize, requestKey]);

  const reload = useCallback(() => setReloadVersion((version) => version + 1), []);

  return {
    page,
    isLoading,
    error,
    goToPage,
    setPageSize,
    reload,
  };
}
