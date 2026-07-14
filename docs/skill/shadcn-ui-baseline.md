# Skill: shadcn UI baseline

For this repo, `components/ui` should remain close to minimal shadcn/ui primitives.

## Rules

- Keep `components/ui` token-based using semantic classes such as:
  - `bg-background`
  - `text-foreground`
  - `bg-primary`
  - `text-primary-foreground`
  - `border-input`
  - `text-muted-foreground`
- Avoid product-specific palette choices inside `components/ui` such as:
  - `bg-sky-*`
  - `bg-slate-*`
  - `text-amber-*`
- Put product styling in feature components, not in the shared UI primitives.
- If a shadcn primitive is edited, prefer the default shadcn structure and only keep small repo-specific adjustments that are clearly necessary.
- Dialog, alert-dialog, and sheet content is portaled in the DOM but still bubbles through React's logical parent tree. Their overlay and content click handlers must stop propagation before calling a caller-provided handler, so a modal rendered from a clickable table row cannot activate that row.
- Keep `components/ui/button` as the unmodified shadcn primitive. Application-facing controls use `components/common/button`, which composes that primitive with the shadcn tooltip components. Its `tooltip` prop is explicit when an action needs custom wording; otherwise it falls back to an accessible label or rendered button text. Use `disableTooltip` for persistent controls such as tabs, where a fallback hover tooltip would be distracting. Icon-only controls need an explicit `tooltip` and accessible label.
- Segmented tab controls should not use the default ghost-button hover background or hover text changes. A sliding selected layer may be used, but it must match the exact button bounds and never use vertical rubber scaling. Keep keyboard focus visible with an inset, zero-offset ring so it does not extend beyond the selected layer. If pointer activation leaves that ring looking like a second selected-tab border, blur only pointer clicks (`event.detail !== 0`); keyboard activation keeps its focus cue.
- When segmented-tab labels have different lengths, measure each Button's rendered bounds and slide/resize the selected layer to those bounds instead of using equal `flex-1` widths. This applies even to equal-width workspace controls: flex rounding, borders, and responsive widths make calculated `calc()` offsets visibly drift. Use a `ResizeObserver` on both the strip and its individual Buttons so a child-only width or margin change cannot leave a stale selected layer. Keep the strip padding symmetric instead of adding a special final-button margin; the measured indicator then has the same left and right gap. For visible metadata chips, prefer a filled semantic Badge over the outline variant when the theme's default outline border is transparent.
- Keep workspace section controls standalone: remove the surrounding section card and heading, and let the muted tab strip size itself to its labels (`w-max`) instead of forcing equal columns. The selected layer uses the background token while the strip uses the muted tint, matching the compact shadcn tab treatment in both themes. Keep the entire control—including outer strip, selected layer, and buttons—pill-rounded when using this treatment.
- For compact metadata with an adjacent icon action, center the label over a flex row containing both the value and action. Do not absolutely position the action, because that makes the visible group look off-center and misaligns the icon vertically.

## Practical effect

- `components/ui` is the neutral base layer.
- Pages and feature components are where app branding and workflow-specific styling should live.
