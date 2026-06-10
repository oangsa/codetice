import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-[#0f172a]/80 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          {hint ? <p className="mt-1 text-sm text-slate-400">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300">{icon}</div> : null}
      </div>
    </div>
  );
}
