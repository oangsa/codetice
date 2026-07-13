# Desktop default scale

Codetice's desktop baseline must feel comfortable at a browser zoom of 100%. At `min-width: 1024px`, set the root font size to `125%` so the rem-based shadcn controls, typography, and Tailwind spacing match the intended desktop density without applying CSS `zoom`.

Keep the authenticated root shell and fixed header fluid (`w-full`) with the same responsive gutters. Do not reintroduce a narrow fixed `max-width` at the app-shell level: on wide displays it creates large unused margins and makes operational tables appear smaller than the rest of the product. Individual reading-focused views may still set their own deliberate content width.

Do not compensate for this baseline by enlarging individual tables, buttons, or text sizes. Those local overrides drift at other breakpoints and themes; change the shared desktop scale only when the product-wide density is intentionally changing.

For text actions, avoid fixed pixel widths at this baseline. Let the label, icon, gap, and rem-based horizontal padding determine the width; fixed widths do not scale with the desktop root font size and can clip otherwise ordinary labels.
