Student editor drafts are stored in `localStorage` by question. Keep the draft keyed per language so switching the language selector preserves each language's in-progress code. Submission detail "Revise" actions should write the submitted `source_code` into the same question draft before navigating back to the workspace question editor.

Submission detail source code should render through the read-only Monaco viewer so submitted code keeps syntax highlighting for its language.
