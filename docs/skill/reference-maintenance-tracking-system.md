# Reference Skill: maintainance-tracking-system

Use `https://github.com/oangsa/maintenance-tracking-system` as a product and architectural-boundary reference, not as a direct implementation source.

## What to reuse

- Dense operational layouts for authenticated users.
- Sidebar and sectioned navigation patterns for admin and student work areas.
- CRUD page rhythm:
  - page header
  - summary metrics where useful
  - data table for lists
  - detail/edit forms in focused views
- Form ergonomics for back-office workflows:
  - compact spacing
  - clear labels
  - explicit actions
  - modal dialogs only for short, bounded edits
- Reusable feature organization patterns:
  - thin route entrypoints
  - shared UI in `components/common/`
  - feature-specific pages, components, schemas, and policies grouped under `modules/`
  - server operations grouped by domain under `server/`

## What not to reuse directly

- React Router route registration. This repo is Next.js App Router.
- The reference project's client `api/` plus pass-through `services/` layers. Codetice is full-stack and its server operations are local domain modules.
- Base UI components. This repo should stay on shadcn-style local UI components.
- Any synchronous assumptions around route params or request APIs.
- The reference project's monolithic data table; Codetice keeps collection authorization and cursor pagination server-side.

## Next.js 16 constraints for this repo

- `params`, `searchParams`, `cookies()`, and `headers()` are async.
- Use `page.tsx`, `layout.tsx`, and `route.ts` file conventions inside `app/`.
- Keep `app/**/page.tsx` as thin exports of `modules/<domain>/pages/*`.
- Keep auth and authorization checks close to the data access layer and route handlers.
- Route handlers should use Web `Request`/`Response` patterns and be treated like public endpoints.
- Keep Node, Docker, database, and secret-bearing modules under `server/`; use `server-only` at runtime boundaries.

## Practical mapping for Codetice

- Reference sidebar/admin shell -> grader admin navigation and workspace navigation.
- Reference management tables -> questions, workspaces, submissions, and leaderboard lists.
- Reference create/edit workflow -> workspace question and testcase editors.
- Reference dashboard density -> class overview, submission summaries, and admin overview cards.

## Decision rule

When using the reference project, copy its boundary discipline, interaction model, and information hierarchy. Rebuild the implementation using Codetice's `app/` → `modules/` → `server/` boundaries instead of copying React Router or redundant request layers.
