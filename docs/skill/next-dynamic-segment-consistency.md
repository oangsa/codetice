# Next App Router dynamic segment consistency

At a single URL depth, Next.js requires one dynamic segment name.  For
example, these routes conflict even though the edit route has an extra static
segment:

```txt
app/workspaces/[id]/questions/[slug]/page.tsx
app/workspaces/[id]/questions/[questionId]/edit/page.tsx
```

Turbopack can build this tree, but `next start` rejects its manifest with
`You cannot use different slug names for the same dynamic path`.

Use one directory name for both routes.  Codetice uses
`questions/[questionId]/page.tsx` and
`questions/[questionId]/edit/page.tsx`; the detail page interprets the value
as a question slug, while the edit child interprets it as a question ID.
This preserves the external URL shape without creating an App Router conflict.
