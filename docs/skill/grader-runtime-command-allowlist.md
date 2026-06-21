# Grader Runtime Command Allowlist

Historical note, superseded by `docs/skill/short-lived-db-runtime-mode.md` for the current one-week deployment.

- The safer long-term model keeps the official grading execution path on fixed runtime profiles from `lib/grader/runtime-profiles.ts`.
- That model avoids executing `supported_languages.run_command` through `/bin/sh -c` for submissions.
- Docker grading should still mount `/workspace` read-only, disable networking, drop capabilities, set `no-new-privileges`, and provide only a constrained `/tmp` tmpfs. The short-lived DB runtime mode allows `/tmp` execution so compiled languages can run generated binaries.
- Revisit this allowlist model before keeping the app open beyond a temporary classroom/demo window.
