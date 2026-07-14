# Workspace Question Form Unification

- The workspace routes `app/workspaces/[id]/questions/new/page.tsx` and `app/workspaces/[id]/questions/[questionId]/edit/page.tsx` use the shared `modules/questions/components/question-form.tsx`.
- Creation posts to `/api/workspaces/[id]/questions`; editing posts to the matching workspace/question resource.
- Question creation includes inline testcase authoring and `.txt` testcase import. A published question must include at least one testcase in the same transaction.
- Question ownership comes only from the route workspace. Do not accept a second grouping or ownership identifier from the browser.
