# Shared data-table surfaces

All application tables render through `components/common/data-table.tsx`. Keep the shared module free of a `use client` directive: server pages can define columns and render cells locally, while client parents automatically include the same component in their client boundary for search, filters, row actions, and local pagination.

Define domain-specific cells with `DataTableColumn<T>` beside the owning feature. Pass toolbar controls through `search`, `actions`, and `filters`, and use `DataTablePagination` for both callback-based local pages and href-based cursor pages. Do not wrap a `DataTable` in another card; the shared component owns the rounded border, toolbar, table header, empty state, and footer spacing.

Only `components/common/data-table.tsx` should import the low-level shadcn table primitives. This keeps submissions, questions, users, scoreboards, members, testcases, leaderboards, and grading history visually aligned without coupling their authorization or data-fetching logic.
