# Question Workspace Height

## Lesson

For the question detail workspace, bound the split editor layout to the viewport instead of giving the panel group a large minimum height. The outer page wrapper should own the viewport height, and every flex ancestor between the panel group and the scrollable content needs `min-h-0`.

## Pattern

- Use a viewport-bounded page shell such as `h-[calc(100dvh-5rem)]`.
- Make the header `shrink-0`.
- Make the resizable panel group `flex-1 min-h-0`.
- Add `min-h-0` to each panel and card that wraps scrollable content.
- Put `overflow-hidden` on the card/content wrapper, then put `ScrollArea` on the detail body.

Without this chain, long markdown descriptions can stretch the entire page instead of scrolling inside the problem detail panel.
