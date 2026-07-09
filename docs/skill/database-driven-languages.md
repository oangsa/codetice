# Database-Driven Languages and Runtimes

- The current short-lived deployment uses database-configured runtime rows for official grading.
- Admins can add a language by configuring `name`, `slug`, `docker_image`, `file_extension`, optional `build_command`, and `run_command`; the app prepares the Docker image before saving.
- Grading executes the configured `build_command` once when present, then executes `run_command` per testcase through `/bin/sh -c`, replacing `{file}` with the generated source path under `/workspace`.
- Keep this mode temporary. For a longer-lived deployment, prefer the reviewed runtime profile allowlist documented in `docs/skill/grader-runtime-command-allowlist.md`.
