# Grader Runtime Profile Validation

Historical note, superseded by `docs/skill/short-lived-db-runtime-mode.md` for the current one-week deployment.

- The fail-closed profile model kept executable grading profiles in `server/grading/runtime-profiles.ts`.
- In that model, database `supported_languages` rows described editor/admin metadata, while submissions also required a reviewed runtime profile.
- Re-enable this model for longer-lived deployments where arbitrary admin-configured run commands are not acceptable.
