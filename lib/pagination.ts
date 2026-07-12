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
