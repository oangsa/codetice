# Grader Runtime Profile Validation

- Official grading is fail-closed through `lib/grader/runtime-profiles.ts`.
- Database `supported_languages` rows can describe editor/admin metadata, but a submission must also have an allowlisted runtime profile before it is enqueued or sample-run.
- Keep seeded language runtime metadata aligned with the allowlisted profile, especially Docker images and direct commands.
