# Schema Push Ordering

- In `db/push.ts`, add `alter table ... add column if not exists ...` statements before any index creation that depends on those columns.
- `create table if not exists` is not enough for upgrade safety when older databases already have the table without the new columns.
- For existing tables, migration ordering matters even in a lightweight push script.
