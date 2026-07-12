"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ClientCursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function useCollectionSearch<T>(input: {
  endpoint: string;
  initialPage: ClientCursorPage<T>;
  initialRequest?: Record<string, unknown>;
  request: Record<string, unknown>;
  debounceMs?: number;
}) {
  const requestKey = useMemo(() => JSON.stringify(input.request), [input.request]);
  const initialKey = useRef(JSON.stringify(input.initialRequest ?? input.request));
  const [observedRequestKey, setObservedRequestKey] = useState(requestKey);
  const [page, setPage] = useState(input.initialPage);
  const [navigation, setNavigation] = useState<{ key: string; cursor: string | null; previous: Array<string | null> }>({
    key: requestKey,
    cursor: null,
    previous: [],
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const requestChanged = observedRequestKey !== requestKey;

  if (requestChanged) {
    setObservedRequestKey(requestKey);
    setNavigation({ key: requestKey, cursor: null, previous: [] });
  }

  const activeNavigation = !requestChanged && navigation.key === requestKey
    ? navigation
    : { key: requestKey, cursor: null, previous: [] };

  useEffect(() => {
    if (requestKey === initialKey.current && activeNavigation.cursor === null && reloadVersion === 0) {
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
          body: JSON.stringify({ ...input.request, cursor: activeNavigation.cursor }),
          signal: controller.signal,
        });
        const payload = await response.json() as ClientCursorPage<T> & { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Unable to load records.");
        if (currentSequence === sequence.current) setPage(payload);
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
  }, [activeNavigation.cursor, input.debounceMs, input.endpoint, input.initialPage, input.request, reloadVersion, requestKey]);

  const next = useCallback(() => {
    if (!page.nextCursor) return;
    setNavigation({
      key: requestKey,
      cursor: page.nextCursor,
      previous: [...activeNavigation.previous, activeNavigation.cursor],
    });
  }, [activeNavigation.cursor, activeNavigation.previous, page.nextCursor, requestKey]);

  const previous = useCallback(() => {
    const previous = activeNavigation.previous;
    if (previous.length === 0) return;
    setNavigation({
      key: requestKey,
      cursor: previous.at(-1) ?? null,
      previous: previous.slice(0, -1),
    });
  }, [activeNavigation.previous, requestKey]);

  const reload = useCallback(() => setReloadVersion((version) => version + 1), []);

  return {
    page,
    isLoading,
    error,
    hasPrevious: activeNavigation.previous.length > 0,
    next,
    previous,
    reload,
  };
}
