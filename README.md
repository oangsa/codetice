# Codetice

Codetice is a workspace-scoped coding grader built with Next.js, Bun, PostgreSQL, Drizzle, and an isolated Docker grading worker.

## Local development

```bash
bun install
bun run db:migrate
bun run dev
```

`db:migrate` is the schema source of truth in every shared or production environment. `db:push:local` exists only for disposable local databases and must not be used for deployment.

Run the worker separately when exercising official grading:

```bash
bun run worker:jobs
```

## Verification

```bash
bun test
bun run test:integration
bun run typecheck
bun run lint
bun run build
bunx drizzle-kit check
```

Database and real-Docker suites are intentionally opt-in because both use external state:

```bash
RUN_DATABASE_INTEGRATION=true \
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/codetice_test \
bun run test:integration

RUN_DOCKER_INTEGRATION=true bun run test:integration
```

The migration suite refuses to run unless `TEST_DATABASE_URL` differs from `DATABASE_URL` and its database name contains `test`.

## Project structure

Codetice uses a domain-oriented structure while keeping the Next.js App Router as the public URL boundary:

```text
app/                 Next pages and API route handlers only
modules/             Feature pages, components, schemas, constants, and browser-safe policies
components/common/   Shared application-level UI such as DataTable and PageHeader
components/ui/       Local shadcn primitives only
server/              Database-backed domain operations and grading infrastructure
lib/                 Cross-domain framework and infrastructure utilities
db/                  Drizzle schema and checked-in migrations
scripts/             Migration, worker, and build entrypoints
tests/               Route, structure, UI-contract, and integration coverage
```

- `app/**/page.tsx` files are thin route entrypoints that export a page from its owning module.
- `app/**/route.ts` files remain HTTP boundaries: authenticate, authorize, validate, invoke one domain operation, and map errors.
- Domain UI belongs under `modules/<domain>`. Raw shadcn components stay in `components/ui`; reusable application patterns stay in `components/common`.
- Server code is grouped by domain. Read paths use `queries.ts`, state changes use `mutations.ts` or named command modules, and workspace authorization remains in the server data-access boundary.
- Grading worker execution, run persistence, and score persistence are separate so Docker execution never becomes coupled to an open database transaction.
- Do not add a second client `api/` plus pass-through `services/` layer. Server Components call server domain modules directly; Client Components call the existing route handlers.

See `docs/skill/domain-oriented-project-structure.md` for placement rules and examples.

## Workspace security model

- Questions, submissions, immutable grading runs, rejudges, and leaderboards are accessed through `/workspaces/:workspaceId`.
- Platform roles are `student` and `admin`; workspace roles are `student` and `ta`.
- TAs manage workspace content and grading. Only global admins manage workspace lifecycle, invite state, membership roles, and removals.
- Staff submissions are official but permanently unranked.
- Outsiders receive `404` for workspace resources. API authentication failures are structured JSON and never redirects.
- Public language DTOs omit Docker images and execution commands.

## Production release

This release includes a destructive, deterministic ownership migration. Take a database backup and rehearse it against a production snapshot before the maintenance window.

1. Build the `migrator`, `runner`, and `worker` targets from the same commit and retain the previous web/worker images.
2. Put the web and worker into maintenance and stop job consumption.
3. Run the snapshot migration and approve the emitted before/after counts for questions, submissions, testcase results, and scores.
4. Run the production migration once:

   ```bash
   docker compose --env-file .env.local --profile release run --rm migrate
   ```

5. Deploy the matching web and worker images together.
6. Smoke test unauthenticated, outsider, student, TA, and global-admin behavior before ending maintenance.
7. Monitor queue depth, expired leases, failed rejudge parents, authorization failures, migration counts, and workspace submission latency.
8. Keep the backup and previous images until smoke checks and monitoring are clean.

The migration uses legacy question-group links only to derive workspace ownership. It intentionally deletes questions with no derivable workspace and submissions with ambiguous ownership for questions formerly shared by multiple workspaces. The final schema removes those legacy grouping tables and aborts on any other unmapped row.
