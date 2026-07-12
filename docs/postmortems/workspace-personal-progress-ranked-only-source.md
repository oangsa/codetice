# Workspace Personal Progress Used a Ranked-Only Source

## Summary

Workspace cards and question rows showed no progress for staff even when their official submissions had completed successfully. The workspace UI read `question_scores`, which intentionally excludes permanent unranked staff submissions. The fix on `feat/classroom-security-remediation` separates personal progress from ranking aggregates and reads personal results from immutable scored runs.

## Symptom

For the `admin` account, every workspace card showed `0%`, and workspace question rows showed `Submission: -`, `Score: None`, and `Status: Todo`. The database contained 86 submissions for that account, including 85 submissions with a `latest_scored_run_id`, but no ranked submissions and no `question_scores` rows.

## Root cause

`listWorkspaceQuestionsPage` in `server/questions/queries.ts` joined `question_scores` for the current user. `workspaceListStatistics` in `server/workspaces/list-statistics.ts` also counted solved questions from `question_scores`.

That table is deliberately rebuilt only from `submissions.is_ranked = true`. After staff submissions became permanently unranked, the table correctly stopped containing TA/admin attempts. The personal-progress UI continued treating the ranked aggregate as a complete submission-history aggregate.

## Why it produced the symptom

TA/admin submissions survived and their immutable runs remained scored, but they produced no `question_scores` record. Both UI queries interpreted the absent aggregate as zero attempts and zero solved questions, so valid staff history appeared not to exist.

## Fix

`server/questions/personal-progress.ts` now counts the current user's submission records without filtering `is_ranked` and computes the personal best from each submission's `latest_scored_run_id`. Workspace solved counts use the same effective-run rule and remain limited to published questions.

Leaderboard and competitive score paths are unchanged: `question_scores` remains ranked-only, and staff submissions remain permanently unranked.

Shared table, workspace-card hover, and progress-track colors were also moved from hard-coded light/dark combinations to shadcn semantic theme tokens. This keeps the existing layout while allowing the active theme variables to control surfaces and contrast.

## How it was found

The screenshots provided a deterministic UI repro. Source tracing showed both views converged on `question_scores`. A read-only database query confirmed the distinguishing condition: 86 submissions, 85 scored submissions, zero ranked submissions, and zero score rows for `admin`. A global-theme diff against `main` rejected the hypothesis that the root theme provider or global CSS had drifted; the remaining theme inconsistencies were component-local hard-coded classes.

## Why it slipped through

This was a latent semantic coupling. Before permanent `is_ranked` behavior, staff could have score aggregates, so `question_scores` appeared suitable for both ranking and personal progress. Regression coverage protected staff exclusion from rankings but did not assert that staff could still see their own official history.

## Validation

- The new progress regressions failed on the prior queries and pass with the fix.
- The actual Drizzle page queries now report `Production Test` as 4/15 solved (27%) and `TEST` as 1/2 solved (50%) for `admin`.
- The question query now reports examples including `Perfect Number`: 8 attempts, best score 100, accepted.
- `bun test`: 131 passed, 10 opt-in integration tests skipped, 0 failed.
- `bun run typecheck`, `bun run lint`, and `bun run build` passed.

## Action items

None outstanding. The source invariant, regression seams, and debugging rule are documented in `docs/skill/personal-progress-versus-ranking.md`.
