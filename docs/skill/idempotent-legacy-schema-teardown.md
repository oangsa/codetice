# Idempotent legacy schema teardown

When a migration adopts databases that were previously created with local
schema push, legacy performance indexes and generated constraint names may be
missing even though the table and column ownership shape is valid.

Use `DROP INDEX IF EXISTS` and `DROP CONSTRAINT IF EXISTS` for the obsolete
names being replaced. Keep the creation of the final indexes and constraints
strict, so the migration still fails if it cannot establish the required final
schema. Drizzle runs PostgreSQL migrations in a transaction; a failed teardown
does not leave partially renamed tables or columns behind.
