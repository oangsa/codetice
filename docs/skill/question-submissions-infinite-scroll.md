# Question submissions infinite scroll

- Keep the problem page submission history in a bounded scroll container instead of letting the tab grow with the page.
- Load only an initial slice of the user's submissions on the server, then request more pages from a question-scoped API endpoint as the user nears the bottom.
- Disable `Link` prefetch inside large submission tables so a long list does not trigger a wave of route preloads.
