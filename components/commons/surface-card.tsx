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
    <Card className={cn("rounded-[30px] border shadow-sm overflow-hidden", className)}>
      {title || description || actions ? (
        <>
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 pb-4">
            <div className="min-w-0">
              {title ? <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle> : null}
              {description ? <CardDescription className="mt-0.5 text-slate-500">{description}</CardDescription> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </CardHeader>
          <div className="h-px bg-black/5 dark:bg-white/10 mx-4" />
        </>
      ) : null}
      <CardContent className={cn("p-4", title || description || actions ? "pt-4" : "pt-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
