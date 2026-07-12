# Workspace-scoped grading integrity

## Context

Codetice resources are owned by a workspace. Each question belongs directly to exactly one workspace and cannot be shared across workspaces.

## Durable implementation rules

- Bind every resource lookup to `workspace_id`; return `404` to outsiders before validating resource-specific filters.
- Keep platform authorization (`student | admin`) separate from workspace authorization (`student | ta`). TAs are workspace staff, never membership or lifecycle administrators.
- Persist `submissions.is_ranked` at creation. Never infer it from a later role because role changes must not rewrite historical ranking intent.
- Treat a grading attempt and a grading run as different things. Attempts count ranked submission rows; rejudges append immutable runs.
- Advance `latest_scored_run_id` only for non-infrastructure verdicts, then recompute the user/question score from every ranked submission's effective run under a transaction-scoped advisory lock.
- Store testcase snapshots on run results so deleting or editing a testcase cannot rewrite historical output visibility.
- Sign cursors and bind them to endpoint, workspace scope, and normalized filters. Stable order always includes the row ID as the final key.
- Create submission, initial run, grading job, and idempotency response in one database transaction.
- Claim one grading job immediately before execution, renew its lease during Docker work, and never keep a database transaction open while a container runs.
- Execute each testcase in a new numeric non-root container with a private `/tmp`. Compiled runtimes build once into a bounded host artifact directory that runners mount read-only and copy into their own `/tmp`.
- Validate Docker image references both when runtime configuration is saved and immediately before every Docker invocation.
- Production uses checked-in migrations. Schema push is only for disposable local development.

## Release discipline

Rehearse ownership migrations on a production snapshot, approve emitted count deltas, deploy the web and worker from the same schema commit during maintenance, and retain the backup plus prior images through smoke testing.
