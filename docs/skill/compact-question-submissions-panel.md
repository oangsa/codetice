# Compact question submissions panel

- Keep the question-page submissions list inside a fixed-height scroll region so the card scrolls instead of the whole page.
- Show roughly 6 to 7 visible submission rows before scrolling by constraining the panel height instead of rendering the list at full panel height.
- Use a smaller initial page size for infinite loading so the tab feels lighter while still preloading enough rows for smooth scrolling.
