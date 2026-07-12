# Domain-oriented project structure

Use this guide when adding or moving application code. The goal is to keep the route surface obvious, keep feature code cohesive, and make server-security boundaries difficult to bypass accidentally.

## Directory responsibilities

```text
app/                 Next.js page, layout, metadata, and route-handler entrypoints
modules/             Browser-safe domain pages, components, schemas, constants, and pure policies
components/common/   Shared application UI patterns
components/ui/       Raw local shadcn primitives
server/              Database, authorization, Docker, queue, and other server-only domain operations
lib/                 Truly cross-domain framework and infrastructure helpers
db/                  Drizzle schema and migrations
scripts/             Operational entrypoints
tests/               Cross-domain route, structure, UI-contract, and integration tests
```

## Page flow

Every feature page is implemented under its owning module. The corresponding Next route is a one-line entrypoint:

```tsx
export { default } from "@/modules/questions/pages/question-page";
```

The module page may authenticate, load authorized server data, and compose Server and Client Components. Interactive components stay as narrow `"use client"` boundaries.

Do not place a second `page.tsx` below `modules/`; only files under `app/` define routes.

## API flow

Route handlers remain explicit HTTP boundaries. They should:

1. validate the current database-backed session;
2. resolve route parameters;
3. authorize the workspace before resource-specific filter validation;
4. parse input with the owning module's schema;
5. invoke an operation from the owning server domain;
6. return the shared structured response or error contract.

Do not reproduce a client `api/*.api.ts` layer followed by a pass-through `services/*.service.ts` layer. Server Components call server modules directly. Client Components use the existing route handlers.

## Module contents

Use `modules/<domain>/` for:

- `pages/`: page implementations selected by thin Next route files;
- `components/`: domain-specific UI;
- `schema.ts`: reusable Zod request or form validation;
- `constants.ts`: browser-safe domain constants;
- pure policies or formatters shared by that domain.

Move a component to `components/common/` only after multiple domains use the same interaction pattern. Keep `components/ui/` free of business logic.

## Server-domain contents

Use `server/<domain>/` for database access, secrets, Docker execution, and authorization-sensitive logic.

- `queries.ts`: authorized reads and minimal DTO construction;
- `mutations.ts` or `commands.ts`: state changes and transactions;
- `authorization.ts` or `ownership.ts`: resource-parent and actor checks;
- focused lifecycle files such as `rejudge.ts`, `worker.ts`, or `run-persistence.ts` when one service would otherwise combine unrelated responsibilities.

Mark runtime server boundaries with `import "server-only"`. Pure calculation modules may remain importable by colocated Bun tests.

## Grading boundary

The grading domain deliberately separates:

- submission creation commands;
- authorized submission and run queries;
- immutable rejudge-tree creation;
- one-at-a-time worker claiming and lease renewal;
- run-result persistence;
- serialized effective-score persistence;
- Docker execution and pure scoring/comparison helpers.

Never hold a database transaction open while Docker executes.

## Testing and moves

- Add or update a deterministic structure/behavior contract before a structural change.
- Keep focused unit tests beside pure domain code.
- Keep cross-domain route, UI-contract, and integration tests under `tests/`.
- Move code without changing URLs, DTOs, authorization order, or UI behavior unless the task explicitly includes a behavior change.
- Run `bun test`, `bun run typecheck`, `bun run lint`, and `bun run build` after structural work.
