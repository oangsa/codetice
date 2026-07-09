# Production Grading Worker Boundary

- The web service should enqueue grading work only; it should not call `processGradingJob()` directly.
- Next.js `after()` runs inside the same web runtime/container, so it still uses the web container's filesystem, binaries, and Docker permissions.
- Docker image pulls and `docker run` calls belong in the grading worker, because the worker service is the container with `docker-cli`, `/var/run/docker.sock`, and `/tmp` mounted.
- Language create/update routes should save runtime configuration without preparing Docker images from the web service.
- The grading worker should periodically inspect enabled language Docker images and pull any that are missing, so a fresh host does not require manual `docker pull`.
- The grading sandbox mounts `/workspace` read-only and provides writable executable `/tmp`; compiled language commands should output to `{binary}` or `/tmp/main`, not `main` in `/workspace`.
- Failed submissions created before a worker-boundary fix remain failed; submit again or rejudge after deployment.
