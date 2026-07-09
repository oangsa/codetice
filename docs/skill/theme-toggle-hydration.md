# Theme Toggle Hydration

- Do not initialize client theme state from `document` during render; it can differ from the server-rendered HTML.
- Pass the server cookie theme into theme UI as an `initialTheme` snapshot.
- If the pre-hydration theme script or stored browser state changed the DOM, use `useSyncExternalStore` with the server snapshot for hydration and the DOM snapshot after hydration.
