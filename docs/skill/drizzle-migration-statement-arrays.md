# Drizzle migration statement arrays

`readMigrationFiles()` returns each Drizzle migration as `MigrationMeta` with
`sql: string[]`, split at `--> statement-breakpoint`. Do not call
`migration.sql.includes()` to look for text inside a migration: that only tests
whether a complete array element exactly equals the search string.

When identifying a migration by one of its statements, search the individual
entries instead:

```ts
migration.sql.some((statement) => statement.includes("expected SQL fragment"))
```

The migration-adoption runner uses this when locating the forward workspace
rename migration.
