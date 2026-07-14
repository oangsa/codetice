import { AppError, ErrorCode, Messages } from "@/lib/errors";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_NUMBER = 1;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
export const MAX_PAGE_SIZE = PAGE_SIZE_OPTIONS.at(-1)!;

export type PageRequest = {
  pageNumber: number;
  pageSize: number;
};

export type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type PagedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

function invalidPagination(): never {
  throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
}

function parsePositiveInteger(value: unknown, fallback: number, maximum: number) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= maximum) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum) return parsed;
  }
  return invalidPagination();
}

export function parsePageRequest(input: {
  pageNumber?: unknown;
  pageSize?: unknown;
}): PageRequest {
  return {
    pageNumber: parsePositiveInteger(input.pageNumber, DEFAULT_PAGE_NUMBER, Number.MAX_SAFE_INTEGER),
    pageSize: parsePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

export function parsePageRequestFromSearchParams(searchParams: URLSearchParams): PageRequest {
  return parsePageRequest({
    pageNumber: searchParams.get("pageNumber"),
    pageSize: searchParams.get("pageSize"),
  });
}

export function pageOffset({ pageNumber, pageSize }: PageRequest) {
  return (pageNumber - 1) * pageSize;
}

export function createPaginationMeta(input: {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}): PaginationMeta {
  const totalPages = Math.ceil(input.totalCount / input.pageSize);
  return {
    currentPage: input.currentPage,
    totalPages,
    pageSize: input.pageSize,
    totalCount: input.totalCount,
    hasPrevious: input.currentPage > 1,
    hasNext: input.currentPage < totalPages,
  };
}

export function parsePaginationMeta(value: string | null): PaginationMeta | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PaginationMeta>;
    const { currentPage, totalPages, pageSize, totalCount, hasPrevious, hasNext } = parsed;
    if (
      !Number.isInteger(currentPage)
      || !Number.isInteger(totalPages)
      || !Number.isInteger(pageSize)
      || !Number.isInteger(totalCount)
      || typeof hasPrevious !== "boolean"
      || typeof hasNext !== "boolean"
      || currentPage === undefined
      || totalPages === undefined
      || pageSize === undefined
      || totalCount === undefined
      || currentPage < 1
      || totalPages < 0
      || pageSize < 1
      || totalCount < 0
    ) {
      return null;
    }

    return parsed as PaginationMeta;
  } catch {
    return null;
  }
}

export function createPagedResult<T>(items: T[], input: {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}): PagedResult<T> {
  return { items, meta: createPaginationMeta(input) };
}

export async function collectPagedItems<T>(
  loadPage: (request: PageRequest) => Promise<PagedResult<T>>,
  pageSize: number = MAX_PAGE_SIZE,
) {
  const items: T[] = [];
  let pageNumber = DEFAULT_PAGE_NUMBER;

  while (true) {
    const page = await loadPage({ pageNumber, pageSize });
    items.push(...page.items);

    if (!page.meta.hasNext) return items;
    if (page.meta.currentPage !== pageNumber || page.meta.totalPages <= pageNumber) {
      throw new Error("Page-number pagination did not advance.");
    }

    pageNumber += 1;
  }
}

export type CursorPageLike<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function collectCursorItems<T>(
  loadPage: (cursor: string | null) => Promise<CursorPageLike<T>>,
) {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  while (true) {
    const page = await loadPage(cursor);
    items.push(...page.items);

    if (!page.hasMore) return items;
    if (!page.nextCursor || seenCursors.has(page.nextCursor)) {
      throw new Error("Cursor pagination did not advance.");
    }

    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
}
