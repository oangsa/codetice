# Rejudge Job Completion

- Question-level rejudge status should reflect every grading job created by that rejudge request.
- Do not mark the umbrella `rejudge_jobs` row completed after processing an arbitrary worker batch; process the created grading job IDs or add an explicit relation from grading jobs to rejudge jobs.
- If any child grading job fails, mark the rejudge job failed so the admin view does not report a partial rejudge as complete.
