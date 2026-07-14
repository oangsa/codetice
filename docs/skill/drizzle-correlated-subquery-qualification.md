# Drizzle correlated subquery qualification

Inside a raw Drizzle `sql` selection, interpolating an outer column object can render only the column name. Interpolating the table and column separately can then be qualified again in a joined outer query and produce an invalid repeated table name.

For a fixed schema identifier, use a static fully-qualified SQL fragment:

```ts
const outerWorkspaceId = sql.raw('"workspaces"."id"');
sql`where inner.workspace_id = ${outerWorkspaceId}`
```

Only use `sql.raw` for hard-coded identifiers, never request data. Protect correlated queries with both a `toSQL()` assertion and a real PostgreSQL service test because mock rendering does not cover every join context.
