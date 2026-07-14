# Skill: page-number collection APIs

Use the platform's shared page-number contract for every collection API.

- Request fields are `pageNumber` (one-based) and `pageSize`; the default page is 1 and standard UI choices are 10, 25, 50, and 100.
- Query the filtered total separately, apply stable `LIMIT pageSize OFFSET (pageNumber - 1) * pageSize`, and return `createPagedResult(items, { currentPage: pageNumber, pageSize, totalCount })` from the domain layer.
- At the route boundary, return `paged(result)`. The JSON body is only `items`; put `result.meta` in the `X-Pagination` header to match the shared API reference.
- `useCollectionSearch` reads that header, passes the page number and page size in its POST request, resets to page 1 when filtering/searching changes, and supports page-size changes.
- Server-rendered pages use `DataTablePagination` with `getPageHref`; client tables use `onPageChange` and `onPageSizeChange`.
- Do not mix opaque cursors with the numbered-page contract. For option lists that must load all rows, use `collectPagedItems` so every request remains a normal page-number request.
