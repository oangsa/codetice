import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6", className)}>
      <div className="min-w-0 pl-1">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 leading-4">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 leading-8">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
