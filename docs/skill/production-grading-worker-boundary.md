# Production Grading Worker Boundary

- The web service should enqueue grading work only; it should not call `processGradingJob()` directly.
- Next.js `after()` runs inside the same web runtime/container, so it still uses the web container's filesystem, binaries, and Docker permissions.
- Docker image pulls and `docker run` calls belong in the grading worker, because the worker service is the container with `docker-cli`, `/var/run/docker.sock`, and `/tmp` mounted.
- Language create/update routes should save runtime configuration without preparing Docker images from the web service.
- Immediately after claiming a job, the grading worker should inspect the selected language image and pull it when missing before invoking the grader.
- After pending jobs are handled, the worker should periodically inspect all enabled language images so a fresh host warms runtimes proactively without delaying already queued work.
- The grading sandbox mounts `/workspace` read-only and provides writable executable `/tmp`; compiled language commands should output to `{binary}` or `/tmp/main`, not `main` in `/workspace`.
- Failed submissions created before a worker-boundary fix remain failed; submit again or rejudge after deployment.
- The worker compile stage must copy `modules/` alongside `server/`, `lib/`, and `db/`: server authorization code imports pure domain policies such as `modules/workspaces/access` through the `@/*` alias.
