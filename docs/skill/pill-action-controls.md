# Pill action controls

Use the shared `Button` component for authoring and member-management actions. Keep the
local action treatment consistent with `h-10 rounded-full px-5 font-semibold` rather than
recreating small `rounded-md` controls with raw elements.

For file inputs, render the label through `Button asChild` so upload controls retain native
file-picker behavior while matching the primary and secondary action controls beside them.
Keep this treatment scoped to action groups; it must not globally change the base button radius.
