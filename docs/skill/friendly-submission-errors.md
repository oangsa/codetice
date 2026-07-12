## Friendly submission error UX

- Do not surface raw Python tracebacks in student-facing grading views.
- Keep grader `errorMessage` stored and available for admin/debug workflows, but map student feedback to status-based text such as `Not correct`, `Runtime error`, or `Time limit exceeded`.
- In this repo, apply that rule in:
  - `modules/questions/editor/code-editor.tsx` for editor output and submit toasts
  - `modules/questions/editor/testcase-results.tsx` for testcase row summaries
  - `app/submissions/[id]/page.tsx` for non-admin submission detail views
