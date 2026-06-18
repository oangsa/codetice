# Client hook boundary in shared UI components

- If a shared UI primitive starts using React client hooks like `useState`, `useEffect`, `useRef`, or `useCallback`, the file itself must be marked with `"use client"`.
- A server page can render that client component, but the component file cannot stay server-only once hooks are introduced.
- When a runtime error points at a hook inside a UI primitive, trace the file boundary first before changing calling pages.
