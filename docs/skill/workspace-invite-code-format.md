# Workspace Invite Code Format

New workspaces and cloned workspaces use six-character, uppercase invite codes drawn from an easy-to-type alphabet that omits visually ambiguous characters such as `O`, `0`, `I`, and `1`.

- Codes are generated with Web Crypto rather than `Math.random()`.
- Inserts retry when the database reports an invite-code collision, preserving the unique database constraint under concurrent creation.
- Existing invite codes are intentionally not rewritten; the join form continues to accept them so previously shared links and codes remain usable.
