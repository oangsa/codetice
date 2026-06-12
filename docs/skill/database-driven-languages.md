# Database-Driven Languages and Runtimes

- Move from a hardcoded allowlist of language profiles (`SUPPORTED_LANGUAGE_SLUGS`, `RUNTIME_PROFILES`) to a fully database-driven model.
- Allow any valid lowercase alphanumeric slug (with hyphens/underscores) for a supported language runtime, validating with Zod.
- Execute the database-configured `run_command` in the Docker sandbox dynamically using `/bin/sh -c "<runCommand>"`.
- Ensure placeholders in the command string (`main.py`, `main.js`, `main.ts`) are replaced with the correct file name based on the database-configured file extension.
- Avoid throwing "Unsafe runtime configuration" errors for custom language runtimes configured by administrators.
