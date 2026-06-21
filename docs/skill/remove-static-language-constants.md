# Remove Static Language Constants

- Do not keep global static language slug lists for grading while the app is using database-configured languages.
- Shared constants should stay domain-wide (`QUESTION_DIFFICULTIES`, `CHECKER_TYPES`, statuses). Do not hardcode keyword completion lists in the app; rely on Monaco/language tooling.
- Remove unused runtime profile modules when grading uses `supported_languages` rows directly.
