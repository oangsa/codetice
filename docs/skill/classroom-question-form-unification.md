# Classroom Question Form Unification

- The classroom route `app/classrooms/[id]/questions/new/page.tsx` should use the shared `components/questions/question-form.tsx` instead of the older `components/classrooms/new-question-form.tsx`.
- Keep classroom-specific creation behavior inside the shared form by posting create requests to `/api/classrooms/[id]/questions` when `classroomId` is provided in create mode.
- Preserve classroom-only fields during shared-form create mode:
  - assignment name
  - optional assignment due date
  - inline testcase authoring and `.txt` testcase import
- Keep admin create/edit behavior unchanged:
  - admin create still posts to `/api/questions`
  - edit mode still uses the persisted testcase table and dialog workflow
