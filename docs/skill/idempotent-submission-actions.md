# Idempotent Submission Actions

- Protect spam-click-prone grading actions with server-side idempotency keys, not only disabled buttons.
- Scope the idempotency key by user identifier, action name, and request payload hash.
- Return the cached response when the same key is replayed with the same payload.
- Reject reused keys that carry a different payload.
- Cache both success and failure responses so a reserved key never gets stuck in an in-progress state.
