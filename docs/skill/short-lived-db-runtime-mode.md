# Short-Lived DB Runtime Mode

- For temporary workspace/demo deployments, grading can use the database `supported_languages` runtime fields directly so admins can add a language without a code deploy.
- In this mode, `run_command` is executed in the Docker sandbox through `/bin/sh -c` after replacing `{file}` with the generated `/workspace/main.<ext>` path.
- Keep Docker sandbox controls enabled (`--network none`, read-only workspace, memory/CPU/PID limits), but mount `/tmp` with explicit `exec` for compiled languages and treat editable run commands as a temporary trust tradeoff.
- Python submissions are pre-screened for blocked system/introspection imports such as `os`, `platform`, and sensitive `sys.*` fields before Docker runs.
- For longer-lived deployments, move executable runtime profiles back to reviewed code or trusted image entrypoints.
