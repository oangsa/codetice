# Main UI Parity With Workspace-Scoped Behavior

## Goal

Keep the visual design and ordinary user behavior from `main` while changing resource ownership, authorization, grading history, pagination, and removed concepts underneath it.

## UI rules

- When relocating a component into `modules/`, preserve its class strings and component hierarchy unless a requested feature requires a visible change.
- This project remaps Tailwind `slate-*` colors to CSS variables in `app/globals.css`. Adding a seemingly harmless dark override can invert the intended color. For example, `dark:bg-slate-900/40` becomes translucent foreground color, and `dark:text-slate-100` becomes the dark page background.
- Shared abstractions such as `DataTable` must reproduce the original main-branch question-table shell rather than introducing a new visual system.
- The problem sample cards and input/output blocks are protected by `tests/ui/main-workspace-ui.test.ts`.

## Allowed behavior differences

- Classroom vocabulary and routes become workspace-scoped.
- Assignments and dedicated leaderboard surfaces are removed; the embedded Scoreboard remains.
- Authorization, cursor pagination, immutable runs, permanent staff unranking, rejudges, and Docker isolation follow the remediation requirements.
- Administrative collections may paginate even though `main` loaded them globally.

Everything else should retain main behavior. In particular:

- Monaco diagnostics use an authenticated workspace endpoint and still populate editor markers.
- Reset links use configured `APP_URL`/`NEXT_PUBLIC_APP_URL`, never the request host.
- Question authoring sees enabled language options even while runtime verification is pending.
- Student selectors retain `main` behavior by showing every enabled language. The worker inspects or pulls the selected image before grading; readiness status remains visible to admins but is not a user-facing availability gate.
- Workspace detail, roster, scoreboard, and submission-filter surfaces must consume every authorized cursor page before applying `main`'s client-side search, sorting, and table pagination. Never silently treat the first 100 records as the complete workspace.
- Local Pyright and no-op diagnostics remain available while runtime verification is pending. Only compiler diagnostics require a prepared Docker runtime.
- Raw grading errors are staff-only at the service DTO boundary; student pages render friendly verdict text even if a component forgets its own visibility check.
- Atomic idempotent mutations cache terminal failures separately after rollback so replaying a failed submit or rejudge key remains deterministic.

## Audit seams

- `tests/ui/main-workspace-ui.test.ts`: workspace navigation and problem/editor parity.
- `components/common/data-table-theme.test.ts`: shared table visual shell.
- `tests/routes/workspace-scope.test.ts`: required workspace routes and hard-removed routes.
- `tests/ui/language-runtime-copy.test.ts`: asynchronous runtime-verification wording.
- `lib/app-url.test.ts`: configured reset-link origin.
- `tests/regressions/main-behavior-drift.test.ts`: worker startup, full cursor consumption, diagnostics readiness, failure idempotency, participant filtering, grading-error redaction, runtime copy, and TA badge parity.
