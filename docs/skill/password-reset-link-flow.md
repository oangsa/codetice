# Password Reset Link Flow

- Use admin-issued one-time reset links for local username/password accounts when there is no email field or delivery channel.
- Store only a SHA-256 hash of the reset token in `password_reset_tokens`; never persist the raw token.
- Expire reset links quickly. This app uses a 30 minute TTL.
- Invalidate any previous unused reset tokens for the same user when generating a new link.
- Mark all unused tokens as used after a successful password change or admin password reset.
- Expose the public recovery UI as a token-based reset form, not a username-only self-service flow.
- Build admin-issued reset links from `APP_URL`, falling back to `NEXT_PUBLIC_APP_URL` only when `APP_URL` is not set.
