# Database-Driven Languages and Runtimes

Historical note, superseded for official submission grading by `docs/skill/grader-runtime-command-allowlist.md`.

- The earlier database-driven runtime plan moved from hardcoded language profiles to arbitrary admin-configured runtime rows.
- That plan allowed valid lowercase alphanumeric slugs with hyphens or underscores.
- It also executed the database-configured `run_command` dynamically through `/bin/sh -c`, replacing `{file}` with the generated source file path.
- Do not reintroduce that shell-based execution path for submissions. It is useful context for why the language admin UI exists, not the current security policy for grading.
