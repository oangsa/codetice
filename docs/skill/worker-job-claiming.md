# Worker Job Claiming

- Claim grading jobs atomically in PostgreSQL, not with a read-then-update race.
- Use `FOR UPDATE SKIP LOCKED` for batch claims so multiple workers can run safely.
- Put a lease on each claimed job so stale running jobs can be reclaimed after a timeout.
- Keep `processPendingGradingJobs` on claimed jobs only; do not re-claim inside the same worker loop.
- Separate direct single-job claiming from already-claimed job processing.
