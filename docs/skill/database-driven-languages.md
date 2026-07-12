# Database-Driven Languages and Runtimes

- The current short-lived deployment uses database-configured runtime rows for official grading.
- Admins can add a language by configuring `name`, `slug`, `docker_image`, `file_extension`, optional `build_command`, and `run_command`; saving marks the runtime `pending`, and the grading worker inspects or prepares the image asynchronously.
- Question authoring and student solving list minimal DTOs for every enabled language, including pending or previously failed runtimes. Runtime state is operational metadata rather than a selector filter.
- Official submissions may be queued for any enabled language. The grading worker prepares only the selected runtime before execution, so a missing image triggers `docker pull` without requiring a manual warm-up.
- Grading executes the configured `build_command` once when present, then executes `run_command` per testcase through `/bin/sh -c`, replacing `{file}` with the generated source path under `/workspace`.
- Keep this mode temporary. For a longer-lived deployment, prefer the reviewed runtime profile allowlist documented in `docs/skill/grader-runtime-command-allowlist.md`.
