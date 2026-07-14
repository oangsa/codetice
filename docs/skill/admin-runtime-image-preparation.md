# Admin Runtime Image Preparation

- Creating, editing, or re-enabling a supported language validates and saves its configuration with `runtime_status = pending`.
- Before grading a claimed job, the worker runs `docker image inspect` for that submission's selected language, pulls the image when missing, verifies it, and then marks the unchanged runtime configuration `ready`; failures set `runtime_status = error` with a bounded error message.
- After queued work is handled, the worker also performs a periodic preparation pass over every enabled runtime so fresh hosts warm images proactively.
- Admin UI copy must say that verification is pending. It must not claim the runtime is ready or being prepared by the save request.
- Question authoring, public/student selectors, and submission creation use every enabled language. `runtime_status` reports worker preparation state; it must not hide an enabled language or block it from being queued.
- Docker image references are validated before saving and immediately before every Docker invocation. CLI arguments are passed as an array rather than shell-concatenated.
- Runtime command validation accepts `{file}` and safe explicit source paths under `/workspace`; compiled baseline artifacts belong under `/tmp` during the build phase.
- Legacy single-line GCC, Clang, and Rust commands that compile and immediately run `/workspace` or `/tmp` artifacts are normalized into a one-time `/tmp` build command plus a per-testcase artifact run command. This preserves existing runtime rows while enforcing build-once grading.
