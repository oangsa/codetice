# Docker Grader Workspace Permissions

- `fs.mkdtemp` creates grading workspaces with restrictive directory permissions on Linux.
- When the worker launches sibling Docker containers through a host Docker socket, user namespace or rootless Docker setups may prevent the sandbox from traversing a `0700` bind-mounted workspace.
- After writing generated source files, set the workspace directory to `0755` and the source file to `0644` before mounting it read-only at `/workspace`.
- Keep the sandbox mount read-only; the permission change is for host-side traversal/readability, not for allowing writes from submitted code.
