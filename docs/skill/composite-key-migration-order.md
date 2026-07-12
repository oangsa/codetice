# Composite key migration order

PostgreSQL requires a referenced composite foreign-key target to already have a
primary key, unique constraint, or unique index over the same ordered columns.

The historical ownership migration temporarily needs unique indexes on
`assignments(workspace_id, id)` and `questions(workspace_id, id)` before adding
the `assignment_questions(workspace_id, assignment_id)` and
`assignment_questions(workspace_id, question_id)` foreign keys. Creating those
indexes afterwards makes PostgreSQL reject the foreign-key migration and rolls
back the transaction. The subsequent retirement migration removes this legacy
grouping domain after ownership has been validated and copied to questions.
