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

## Practical effect

- `components/ui` is the neutral base layer.
- Pages and feature components are where app branding and workflow-specific styling should live.
