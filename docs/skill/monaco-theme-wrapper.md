# Monaco Theme Wrapper

Use `modules/questions/editor/monaco-code-editor.tsx` for every Monaco instance. It owns the Codetice dark theme, watches the root `dark` class, and exposes `disabled` for read-only viewers such as submitted code.

Avoid separate Monaco theme observers in individual editor views. Mounting the main editor through this wrapper prevents the dark-mode refresh flash that happens when a page renders a placeholder first and applies the Monaco theme later.
