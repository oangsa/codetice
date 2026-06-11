## Router refresh after async grading

- In Next.js App Router client components, use `useRouter().refresh()` after an async submission finishes processing if the current page includes server-rendered submission data.
- This refreshes the current route's Server Components and updates server-fetched tables like submission history without discarding unaffected client state such as Monaco editor content, local tabs, or scroll position.
- In this repo, the question page renders the submissions tab from `listQuestionSubmissions(...)` on the server, while the editor polls `/api/submissions/[id]` on the client. The polling loop should call `router.refresh()` once the submission leaves `queued` or `running`.
