# Server search and sandbox job boundaries

## Collection search

- Search and structured filters must run in SQL before cursor pagination.
- Filtered endpoints use `POST .../search` with the shared collection-search body and return `CursorPage<T>`.
- Every endpoint maps an allowlisted public field name to a concrete Drizzle column. Never accept raw database identifiers or arbitrary ordering expressions.
- Authenticate and establish workspace access before parsing resource-specific fields.
- Bind opaque cursors to the normalized endpoint, actor scope, and canonical search body. A cursor from different filters must return 400.
- Preserve PostgreSQL timestamp precision in cursor keys (for example, select `created_at::text`). Converting the key through JavaScript `Date` truncates microseconds and can skip rows created within the same millisecond.
- Client tables use `useCollectionSearch`, reset cursor history on every request-body transition (including when a user clears a search back to an earlier body), abort stale requests, and ignore out-of-order responses.
- Execute raw SQL collection branches in a real PostgreSQL integration test. TypeScript and production compilation cannot detect malformed CTE syntax.

## Docker ownership

- The production web image must not need Docker CLI or socket access.
- Official submissions use immutable grading jobs. Sample runs and compiler diagnostics use the separate `sandbox_jobs` queue because they are transient and must not affect scores.
- Pyright and no-op diagnostics may execute in the web process because they do not invoke Docker.
- The worker prepares or pulls the selected image, claims one job immediately before execution, renews its lease, and performs no Docker work inside a database transaction.
- Sample jobs expose only sample testcase output. Compiler diagnostic jobs expose parsed editor markers.
- Clear transient source code when a sandbox job reaches a terminal state and delete expired terminal jobs after the configured retention window.

## Migration adoption

When a migration follows an already-adoptable schema, add a distinct pre-migration schema probe. Never treat “the old schema is complete” as permission to mark all newer migrations applied; adopt only through the migration immediately before the new change.
