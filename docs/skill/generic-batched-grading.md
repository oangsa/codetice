# Generic Batched Grading

- Grading configured languages now uses one foreground Docker container per grading request in the normal path. The container runs `/workspace/grader-harness.sh` once and loops over testcase input files.
- `supported_languages.run_command` is still database-driven and is executed through `/bin/sh -c` inside the sandbox.
- `supported_languages.build_command` is optional and runs once before testcase commands. Build artifacts should be written to `/tmp`.
- `{file}` is the only special source-file placeholder. Do not add language-specific rewrites such as `main.py`, `main.js`, or `main.ts`.
- Keep the Docker sandbox flags aligned with the single-run path: no network, read-only workspace, memory/CPU/PID limits, dropped capabilities, `no-new-privileges`, and writable `/tmp` tmpfs.
- The harness emits length-prefixed testcase stdout/stderr blocks so student output can contain newlines and marker-like text.
- If a testcase times out, OOMs, or exits non-zero, recreate the container before continuing remaining testcases.
