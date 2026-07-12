# Drizzle correlated subquery qualification

Inside a raw Drizzle `sql` selection, interpolating an outer column as `${table.column}` can render only the column name. In a correlated subquery this may silently bind to an inner column or fail as ambiguous when more than one inner table has that name.

Interpolate the table and column directly at every correlation site:

```ts
sql`where inner.workspace_id = ${workspaces}.${workspaces.id}`
```

Do not first store that expression in a nested `SQL` fragment; Drizzle may qualify the nested column again and render a duplicated table name. Protect the query with a `drizzle.mock().select(...).toSQL()` regression that asserts the complete qualified identifier and rejects the unqualified form.
