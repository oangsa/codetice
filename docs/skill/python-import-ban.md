# Python Import Ban

- Python submissions are blocked before Docker execution when they contain any `import ...` or `from ... import ...` statement.
- Dynamic import helpers such as `__import__(...)` and `import_module(...)` are also blocked.
- Keep the user-facing error generic: `Blocked import. Python submissions cannot use imports.`
- This policy is intentionally broader than the old system-module-only block.
