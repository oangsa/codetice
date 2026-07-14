# Personal Progress Versus Ranking Aggregates

## Use this when

A workspace question list or workspace progress card shows no attempts for a user who has submissions, especially when that user is a TA or platform admin.

## Invariant

Personal progress and leaderboard eligibility are different concerns:

- Personal attempts count the user's submission records, whether ranked or unranked.
- Personal best score comes from each submission's `latest_scored_run_id`, so rejudges can raise or lower the effective result and infrastructure failures do not erase the last scored verdict.
- `question_scores` remains a ranked-only aggregate. It drives competitive scoring and must not be used as the source of personal history for staff.
- Staff submissions remain permanently `is_ranked = false`; showing them in personal progress must never add staff to a leaderboard.

## Query pattern

For a user/question pair:

1. Count matching rows in `submissions` without filtering `is_ranked`.
2. Join each submission to `submission_runs` through `latest_scored_run_id`.
3. Use the maximum effective run score as the personal best.
4. Mark a question solved when that best score is at least the question's total score.

Workspace progress applies the same rule only to published questions in that workspace.

## Regression coverage

- `server/questions/personal-progress.test.ts` prevents personal queries from falling back to `question_scores` or filtering `is_ranked`.
- `server/workspaces/list-statistics.test.ts` verifies workspace solves come from immutable scored runs.
- `server/grading/effective-score.test.ts` separately preserves ranked-only scoring and staff exclusion.
