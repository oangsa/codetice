# Workspace tags and safe content cloning

Use a two-scope tag catalog for teaching content: global preset rows have a null `workspace_id` and are read-only, while local rows have a workspace ID and are editable only by workspace staff. Enforce the scopes with partial unique indexes and a database check constraint, then expose a catalog that gives students presets plus only local tags attached to published questions.

Question tags should be synchronized inside the same transaction as question create or update. For page-number filtering, canonicalize selected tag IDs before executing the query; query them with a correlated `EXISTS` and `IN (...)` predicate to implement match-any behavior without duplicate question rows.

Clone only content-owned records: the question, test cases, custom checkers, and tag mappings. Generate a new slug and actor-owned question row. Reuse preset IDs, map local tags by destination slug, and create missing destination-local tags. Never traverse from a question into submissions, runs, results, scores, rejudge/grading jobs, or sandbox work.

When adding a migration after a legacy-adoption boundary, make the migration runner recognize the verified schema immediately before the new migration. Record history through that prior migration, then let Drizzle execute the new migration normally; do not adopt the new schema version from an older schema state.
