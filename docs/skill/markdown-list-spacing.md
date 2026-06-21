# Markdown List Spacing

## Lesson

Problem statements often include nested bullet lists. Keep markdown vertical rhythm compact enough for long descriptions by controlling both the root line height and the margins inside list items.

## Pattern

- Use a compact custom line height such as `leading-[1.55]` for the markdown body and list items.
- Keep paragraph margins around `mb-1.5`.
- Use `space-y-1` when list items need a little breathing room after structural markdown `<br />` bugs are removed.
- Let inline bold text inherit the surrounding line-height with `leading-[inherit]`.
- Collapse paragraph margins inside `li` with selectors like `[&>p]:mb-0.5` and `[&>p:last-child]:mb-0`.
- Once structural `<br />` tags are gone, use small nested-list margins such as `mt-1 mb-1` to separate a parent bullet from its child list.
- Do not preserve line breaks recursively from `li` children. Markdown ASTs include structural newline text nodes around nested lists; converting those to `<br />` creates fake blank rows between bullets.
