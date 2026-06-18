# Editor Font And Diagnostics

- Monaco uses `Agave` as the preferred monospace editor font, with `Agave Nerd Font`, `Cascadia Code`, `Fira Code`, and generic monospace fallbacks.
- `supported_languages` can define editor diagnostics with:
- `diagnostics_format`: `none`, `pyright`, or `compiler`
- `diagnostics_command`: optional command string with `{file}` placeholder for compiler-style diagnostics
- Python diagnostics run through local `pyright`.
- Compiler diagnostics run inside the configured language Docker image and parse GCC/Clang-style output.
- The editor reads diagnostics from `/api/languages/diagnostics`, so diagnostics are keyed by selected language slug rather than hardcoded to Python.
