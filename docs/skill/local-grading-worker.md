# Local Grading Worker

- `POST /api/submit` enqueues a grading job; it does not grade inline.
- Local development must run the grading worker beside Next.js, otherwise submissions remain `queued`.
- Keep `bun run dev` as the full local app command: start both Next.js and `scripts/process-grading-jobs.ts`.
- Keep `bun run dev:web` available when intentionally running only the web server.
- The worker should claim pending jobs before proactive Docker image preparation so large image pulls do not delay already queued work.
- Keep idle worker polling quiet; log errors, not successful empty polls.
