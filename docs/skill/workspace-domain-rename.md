# Workspace domain rename

The public and internal domain term is `workspace`.  Resource URLs use
`/workspaces/:workspaceId`, API routes use `/api/workspaces/:workspaceId`, and
the current database objects use `workspaces`, `workspace_members`, and
`workspace_id`.

Keep historical Drizzle migrations immutable.  The earlier classroom-named
migrations are retained so databases that already recorded them can continue
their migration history.  `0003_rename-classroom-to-workspace.sql` is the
forward-only data-preserving transition from those database names.

`scripts/migrate.ts` recognizes a verified pre-rename schema with no Drizzle
history, records only the migrations it already embodies, and then applies the
rename.  It similarly adopts a verified already-renamed schema.  Any partial
ownership shape or unknown migration history must abort rather than guessing.

Do not add classroom route aliases or redirects: the removed `/classrooms`
pages and APIs must remain ordinary 404s.
