# Workspace directory search

Keep workspace directory search server-backed so a query applies to every authorized cursor
page, not only to the cards already rendered in the browser. Bind the normalized query to the
cursor filter string and preserve it when rendering the next-page link.

The dashboard search field owns only URL navigation; authorization and name filtering stay in
`server/workspaces/queries.ts`. Reset the cursor whenever the query changes.

Place the toolbar directly above the directory heading. Do not retain the old decorative header
spacer or the default `PageHeader` vertical padding there, otherwise the search-to-heading gap
becomes visibly larger than the card dashboard reference.
