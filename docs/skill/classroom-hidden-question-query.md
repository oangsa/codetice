# Classroom Hidden Question Query

- The classroom question list should exclude unpublished questions in the server query unless manager edit mode is explicitly requested.
- Keep edit mode in the URL with `editMode=1` so the server component can decide whether hidden questions are fetched.
- Display row numbers from the visible paginated rows, not from an unfiltered source list.
