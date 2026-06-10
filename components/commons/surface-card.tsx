import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SurfaceCard({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("border-white/10 bg-[#111827]/88 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]", className)}>
      {title || description || actions ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div className="min-w-0">
            {title ? <CardTitle className="text-base text-slate-100">{title}</CardTitle> : null}
            {description ? <CardDescription className="mt-1 text-slate-400">{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("text-slate-200", title || description || actions ? "pt-5" : "pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
