# Grader Runtime Command Allowlist

- Keep the official grading execution path on fixed runtime profiles from `lib/grader/runtime-profiles.ts`.
- Do not execute `supported_languages.run_command` through `/bin/sh -c` for submissions; database-configured commands are too easy to turn into shell behavior.
- Docker grading should run the interpreter directly, mount `/workspace` read-only, disable networking, drop capabilities, set `no-new-privileges`, and provide only a constrained `/tmp` tmpfs.
- Admin language metadata can still drive editor labels and diagnostics, but submission grading must stay fail-closed on unsupported language slugs.
