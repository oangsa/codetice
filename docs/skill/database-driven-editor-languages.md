# Database-Driven Editor Languages

- Supported languages are configured in the `supported_languages` table, not in backend allowlists.
- `editor_language` stores the Monaco language id used for syntax highlighting, such as `python`, `javascript`, `typescript`, `cpp`, or `plaintext`.
- Python diagnostics are enabled when `editor_language` is `python`; other languages currently receive syntax highlighting only.
- Admin runtime commands can use `{file}` as the generated source file placeholder. The grader replaces it with `/workspace/main.<extension>` before running the Docker command.
- Docker images must already be available locally or pullable by Docker. If Docker cannot pull an image such as `gcc:13`, use a local image tag or pre-pull/build the image outside the app.
