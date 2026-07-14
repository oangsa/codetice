# Local Grading Worker

- Official submissions enqueue grading jobs; they do not grade inline.
- `bun run dev` is the complete local application command and starts both Next.js and `scripts/process-grading-jobs.ts`.
- Keep `bun run dev:web` available for intentionally running only the web process.
- Process queued work before proactive Docker image preparation so image pulls do not delay existing jobs.
- Keep idle polling quiet. Log processed work, image pulls, and errors, but do not emit successful zero-work polls or repeated image-ready messages.
