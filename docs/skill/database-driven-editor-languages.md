# Database-Driven Editor Languages

- Supported languages are configured in the `supported_languages` table, not in backend allowlists.
- `editor_language` stores a real Monaco language id used for syntax highlighting, such as `python`, `javascript`, `typescript`, `cpp`, or `plaintext`.
- The admin form loads `monaco.languages.getLanguages()` client-side and validates new saves against those registered IDs.
- Compatibility aliases still normalize old tool-name rows (`pyright`, `pylsp`, `clang`, `clangd`, etc.) before saving or rendering.
- After switching selected languages, explicitly call `monaco.editor.setModelLanguage`; the React `language` prop alone may leave the existing Monaco model in its previous mode.
- The student editor must receive `default_starter_code` from `supported_languages`; otherwise empty question starter code can accidentally fall back to hardcoded snippets instead of the configured language default.
- Python diagnostics are enabled when `editor_language` is `python`; other languages currently receive syntax highlighting only.
- Admin runtime commands can use `{file}` as the generated source file placeholder. The grader replaces it with `/workspace/main.<extension>` before running the Docker command.
- Docker images must already be available locally or pullable by Docker. If Docker cannot pull an image such as `gcc:13`, use a local image tag or pre-pull/build the image outside the app.
