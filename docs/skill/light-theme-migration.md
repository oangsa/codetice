# Light Theme Migration — Vibe Grader

## Overview

The project was migrated from a dark/cyber aesthetic (deep navy + cyan accents) to a clean light professional theme modelled after the `maintainance-tracking-system` reference project.

## Changes Made

### `app/globals.css`
- Replaced dark `#070b14` background variables with light `oklch(0.98 0 0)` / `#f9fafb`
- Added full shadcn CSS variable set (card, popover, primary, secondary, muted, accent, etc.)
- Switched to Inter font via `@theme { --font-sans: "Inter" }`
- Removed dark radial/linear body gradient
- Removed cyan `::selection` color → replaced with blue
- Added `@theme inline` with all color mappings for Tailwind v4

### `app/layout.tsx`
- Switched from Geist to Inter (`next/font/google`)

### `components/site-header.tsx`
- `bg-[#08101d]/88 backdrop-blur` → `bg-white shadow-sm border-b border-slate-200`
- Cyan brand colors → `bg-slate-900 text-white` for logo icon
- All nav link hover states → standard `hover:bg-slate-100 hover:text-slate-900`
- Admin badge → `bg-amber-50 text-amber-700`

### `components/user-menu.tsx`
- Dark button → `border border-slate-200 bg-white text-slate-700`
- Avatar → `bg-slate-900 text-white`

### `components/common/page-header.tsx`
- Removed frosted glass `bg-white/[0.03] border-white/10 backdrop-blur`
- Simple flex row: title left, actions right, no background

### `components/common/metric-card.tsx`
- `bg-[#0f172a]/80 border-white/10` → `bg-white border-slate-200 shadow-sm`
- Icon box: `bg-cyan-400/10 text-cyan-300` → `bg-slate-50 border-slate-200 text-slate-600`

### `components/common/surface-card.tsx`
- Removed `bg-[#111827]/88 border-white/10` dark background overrides
- Now uses standard Card without background override
- Border: `border-white/8` → `border-slate-100`

### `modules/auth/components/auth-form.tsx`
- Card: removed `bg-[#0f172a]/88 border-white/10` → standard Card
- Inputs: removed `border-white/10 bg-white/[0.04] text-slate-100` overrides
- Submit button: removed cyan override → standard Button
- Added user/lock icons on inputs (matching reference style)

### `modules/questions/components/question-card.tsx`
- Card: `bg-[#0f172a]/88 border-white/10` → standard white Card
- Title: `text-slate-100` → standard
- Button: cyan → standard Button

### `modules/submissions/components/submission-table.tsx`
- Removed `text-slate-300`, `border-white/8`, `hover:bg-white/[0.03]`
- Score Badge: removed cyan override → standard `variant="info"`
- View link: `text-cyan-300` → `text-sky-600`

### `modules/submissions/components/submission-status-badge.tsx`
- Removed `border-white/10 bg-white/[0.04] uppercase tracking-[0.08em]`
- Now uses `className="capitalize"` only

### `modules/questions/editor/code-editor.tsx`
- Card: `bg-[#111827]/88` → standard
- Select: removed dark overrides
- Buttons: cyan → standard; secondary button simplified
- Editor theme: `vs-dark` → `vs` (light Monaco theme)
- Tabs: removed dark custom classes

### `modules/questions/editor/output-panel.tsx` + `testcase-results.tsx`
- `bg-[#0f172a]/88 border-white/8` → standard Card
- `bg-black/25 text-slate-200` pre blocks → `bg-slate-50 border-slate-200 text-slate-800`

### Pages
- `login/` + `register/`: centered full-screen layout, logo icon, standard links (underline instead of cyan)
- `dashboard/`, `admin/`: cyan Buttons → standard Button
- `questions/[slug]/`: tabs, sample displays, ResizableHandle → light theme equivalents

## Design Tokens (light theme)

| Token | Value |
|---|---|
| background | `oklch(0.98 0 0)` ≈ `#f9fafb` |
| foreground | `oklch(0.145 0 0)` ≈ `#111827` |
| card | `oklch(1 0 0)` = white |
| primary | `oklch(0.205 0 0)` = near-black |
| muted | `oklch(0.97 0 0)` ≈ `#f3f4f6` |
| border | `oklch(0.922 0 0)` ≈ `#e5e7eb` |
| font | Inter (Google Fonts) |
