Student editor drafts are stored in `localStorage` by question and assignment context. Keep the draft keyed per language so switching the language selector preserves each language's in-progress code. Submission detail "Revise" actions should write the submitted `source_code` into the same draft key before navigating back to the question editor.

Submission detail source code should render through the read-only Monaco viewer so submitted code keeps syntax highlighting for its language.
