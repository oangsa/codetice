# MultiSelect nested button hydration fix

- Do not render removable chips or clear buttons inside a trigger that is itself a native `button`; that creates invalid nested interactive HTML and causes hydration errors.
- For composite multiselect triggers, prefer a focusable container with `role="combobox"` and keyboard handlers, then keep chip removal and clear actions as real inner buttons.
- When changing a custom combobox trigger away from a native button, carry over keyboard toggling and `aria-controls` / `aria-expanded` support.
