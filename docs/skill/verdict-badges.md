# Verdict Badges

Use `components/common/verdict-badge.tsx` for judge verdict colors instead of adding custom variants to `components/ui/badge.tsx`.

The shadcn `Badge` should stay registry-compatible. Verdict styling is layered through `className` using `VerdictBadge`, and submission statuses should render through `SubmissionStatusBadge`.
