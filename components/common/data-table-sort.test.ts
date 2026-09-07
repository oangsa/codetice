import { describe, expect, test } from "bun:test";

import { sortDataTableRows, type DataTableColumn } from "@/components/common/data-table";

type Row = { id: string; name: string | null; score: number | null; createdAt: Date };

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", sortKey: "name", sortValue: (row) => row.name, cell: (row) => row.name },
  { id: "score", header: "Score", sortKey: "score", sortValue: (row) => row.score, cell: (row) => row.score },
  { id: "created", header: "Created", sortKey: "created", sortValue: (row) => row.createdAt, cell: (row) => row.createdAt.toISOString() },
];

const rows: Row[] = [
  { id: "1", name: "zebra", score: 2, createdAt: new Date("2025-01-02") },
  { id: "2", name: "Alpha", score: 10, createdAt: new Date("2025-01-01") },
  { id: "3", name: null, score: null, createdAt: new Date("2025-01-03") },
];

describe("local data table sorting", () => {
  test("sorts text case-insensitively and keeps empty values last", () => {
    expect(sortDataTableRows(rows, columns, { name: "name", direction: "asc" }).map((row) => row.id)).toEqual(["2", "1", "3"]);
    expect(sortDataTableRows(rows, columns, { name: "name", direction: "desc" }).map((row) => row.id)).toEqual(["1", "2", "3"]);
  });

  test("sorts numbers numerically and dates chronologically", () => {
    expect(sortDataTableRows(rows, columns, { name: "score", direction: "asc" }).map((row) => row.id)).toEqual(["1", "2", "3"]);
    expect(sortDataTableRows(rows, columns, { name: "created", direction: "desc" }).map((row) => row.id)).toEqual(["3", "1", "2"]);
  });
});
