# Shared data-table surfaces

All application tables render through `components/common/data-table.tsx`. Keep the shared module free of a `use client` directive: server pages can define columns and render cells locally, while client parents automatically include the same component in their client boundary for search, filters, row actions, and local pagination.

Define domain-specific cells with `DataTableColumn<T>` beside the owning feature. Pass toolbar controls through `search`, `actions`, and `filters`, and use `DataTablePagination` for callback-driven pages or server-rendered page links through `getPageHref`. Do not wrap a `DataTable` in another card; the shared component owns the rounded border, toolbar, table header, empty state, and footer spacing.

The shared shell follows the compact reference-table treatment: a neutral `rounded-lg` surface, a short header, and `px-3 py-2` cells. Keep row actions on one line; use compact icon actions with explicit tooltips when a row would otherwise wrap and become tall. `DataTablePagination` consumes reference-compatible metadata (`currentPage`, `totalPages`, `pageSize`, `totalCount`, `hasPrevious`, `hasNext`), shows the visible range, supports 10/25/50/100 page sizes for client tables, and can render numbered links for server pages.

`DataTablePagination` is usable from both Server and Client Components. When a server page supplies only `getPageHref`, do not create or forward an `onClick` closure: render links and inert disabled controls only. Create callbacks only when a client caller explicitly supplies `onPageChange` or `onPageSizeChange`; otherwise Next cannot serialize the handler across the server/client boundary.

Only `components/common/data-table.tsx` should import the low-level shadcn table primitives. This keeps submissions, questions, users, scoreboards, members, testcases, leaderboards, and grading history visually aligned without coupling their authorization or data-fetching logic.

For server-filtered history tables, keep the toolbar compact: expose one common `Button` that opens the same dialog-style advanced-filter workflow used by client collection tables, then navigate with the selected query parameters. Do not place several raw `Select` controls directly in the table toolbar; their portaled menus are visually noisy and can introduce popup-edge artifacts beside the table.
