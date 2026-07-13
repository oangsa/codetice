# Server search and sandbox job boundaries

## Collection search

- Search and structured filters must run in SQL before page-number pagination.
- Filtered endpoints use `POST .../search` with the shared collection-search body. The body accepts `pageNumber` and `pageSize`; list responses return the current items array and send the `PagedResult<T>.meta` object in `X-Pagination`.
- Every endpoint maps an allowlisted public field name to a concrete Drizzle column. Never accept raw database identifiers or arbitrary ordering expressions.
- Reject unknown request properties instead of silently broadening a mistyped search, and cap both the number of structured filters and every user-controlled search value before building SQL.
- Authenticate and establish workspace access before parsing resource-specific fields.
- Calculate a filtered `totalCount` alongside every `LIMIT/OFFSET` query and build `currentPage`, `totalPages`, `pageSize`, `totalCount`, `hasPrevious`, and `hasNext` with `createPagedResult`.
- Keep ordering stable for every paged collection. Use an explicit unique tiebreaker after the primary order field so adjacent page boundaries remain deterministic.
- Client tables use `useCollectionSearch`, reset to page 1 on every request-body transition (including when a user clears a search back to an earlier body), preserve the selected page size, abort stale requests, and ignore out-of-order responses.
- Execute raw SQL collection branches in a real PostgreSQL integration test. TypeScript and production compilation cannot detect malformed CTE syntax.

## Docker ownership

- The production web image must not need Docker CLI or socket access.
- Official submissions use immutable grading jobs. Sample runs and compiler diagnostics use the separate `sandbox_jobs` queue because they are transient and must not affect scores.
- Pyright and no-op diagnostics may execute in the web process because they do not invoke Docker.
- The worker prepares or pulls the selected image, claims one job immediately before execution, renews its lease, and performs no Docker work inside a database transaction.
- Sample jobs expose only sample testcase output. Compiler diagnostic jobs expose parsed editor markers.
- Clear transient source code when a sandbox job reaches a terminal state. Expired queued jobs and expired running jobs without a live lease must be deleted even if no worker ever made them terminal, and workers must exclude expired jobs while claiming work.

## Migration adoption

When a migration follows an already-adoptable schema, add a distinct pre-migration schema probe. That probe must assert the new table is absent; the current-schema probe must verify required columns, nullability, constraints, and indexes rather than table existence alone. Never treat “the old schema is complete” as permission to mark all newer migrations applied; adopt only through the migration immediately before the new change.

Use `to_regclass('schema.table')` when an adoption probe references an optional relation. A direct `'schema.table'::regclass` cast raises before the boolean expression can reject a missing table because PostgreSQL does not guarantee `AND` short-circuit evaluation.
