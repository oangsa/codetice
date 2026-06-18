# Profile Session Cookie Limit

- The profile picture can be stored as a base64 `data:` URI in the database, which may be several kilobytes long.
- Do not copy `profilePicture` into the signed session cookie. Browsers commonly reject or truncate oversized cookies, which leaves the app rendering stale profile data from the previous session payload.
- Keep the auth session cookie limited to stable identity fields such as `userId` and `role`.
- For display data like `username` and `profilePicture`, resolve the current user from the database on each request before rendering shared UI such as the header or settings page.
