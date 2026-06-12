# Grading Security Hardening

- Treat SQL injection as a query-construction problem: keep application queries on Drizzle builders and never concatenate user input into SQL.
- Do not execute student code on the host. If Docker sandboxing is unavailable, fail the grading request closed.
- Do not pass database-configured runtime commands through `sh -lc`. Use a fixed allowlist of language runtime profiles and execute the command directly.
- Cap submission source size and captured stdout/stderr so a malicious submission cannot exhaust process memory.
- Accept only known-safe runtime configuration for each supported language slug.
