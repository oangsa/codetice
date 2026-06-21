# Monaco Completions

- Monaco does not provide equally rich completions for every language by default; Python and Rust mostly rely on syntax/token support unless a language server is wired in.
- Do not hardcode keyword completion lists in the app codebase.
- For richer completions, wire a real language server or Monaco language contribution for the configured editor language.
