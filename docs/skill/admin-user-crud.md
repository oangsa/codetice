# Admin User CRUD

- Admin user management should use the existing operational table style: rounded tool surface, quick search, advanced filter dialog, active filter chips, and compact action buttons.
- Keep reset password and reset-link actions available beside edit/delete; full CRUD does not replace password recovery tools.
- Prevent self-delete and prevent removing the final admin account.
- Increment a user's `token_version` when their role changes so stale sessions cannot keep old permissions.
- Before deleting a user, clear nullable creator/requester references so authored questions, classrooms, and rejudge history remain.
