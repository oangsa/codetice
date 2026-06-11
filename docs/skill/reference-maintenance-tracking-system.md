# Reference Skill: maintainance-tracking-system

Use `D:\Code\Repos\JS\RepairService\maintainance-tracking-system` as a product and UI architecture reference, not as a direct implementation source.

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
  - shared UI in `components/`
  - feature-specific logic grouped by domain
  - service layer separation for data operations

## What not to reuse directly

- React Router route modules. This repo is Next.js App Router.
- Reference project APIs, providers, and route conventions.
- Base UI components. This repo should stay on shadcn-style local UI components.
- Any synchronous assumptions around route params or request APIs.

## Next.js 16 constraints for this repo

- `params`, `searchParams`, `cookies()`, and `headers()` are async.
- Use `page.tsx`, `layout.tsx`, and `route.ts` file conventions inside `app/`.
- Keep auth and authorization checks close to the data access layer and route handlers.
- Route handlers should use Web `Request`/`Response` patterns and be treated like public endpoints.

## Practical mapping for vibe-grader

- Reference sidebar/admin shell -> grader admin navigation and classroom navigation.
- Reference management tables -> questions, classrooms, submissions, and leaderboard lists.
- Reference create/edit workflow -> question editor, testcase editor, classroom/question assignment flows.
- Reference dashboard density -> class overview, submission summaries, and admin overview cards.

## Decision rule

When using the reference project, copy the interaction model and information hierarchy. Rebuild the implementation in the local Next.js 16 patterns already used by `vibe-grader`.
