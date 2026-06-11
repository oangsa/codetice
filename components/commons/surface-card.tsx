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
    <Card className={cn("rounded-xl border-slate-200 shadow-sm", className)}>
      {title || description || actions ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/70 pb-4">
          <div className="min-w-0">
            {title ? <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle> : null}
            {description ? <CardDescription className="mt-0.5 text-slate-500">{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(title || description || actions ? "pt-5" : "pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
