# Multilanguage Grader Runner Naming

- Use language-neutral names for shared grading execution helpers.
- The Docker-backed runner is `lib/grader/run-code.ts`; do not reintroduce Python-specific module names for code paths that execute multiple languages.
- Keep language-specific policy inside the shared runner or split it into clearly named policy helpers when it grows.
