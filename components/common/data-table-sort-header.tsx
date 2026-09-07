"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/common/button";
import type { DataTableSortDirection } from "@/components/common/data-table";
import { cn } from "@/lib/utils";

export function DataTableSortHeader({
  children,
  direction,
  href,
  label,
  onClick,
}: {
  children: ReactNode;
  direction: DataTableSortDirection | null;
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const className = cn(
    "-ml-2 inline-flex h-8 gap-1 rounded-md px-2 text-xs font-semibold",
    direction ? "text-slate-950 dark:text-white" : "text-slate-500",
  );
  const content = <>{children}<Icon className="h-3.5 w-3.5" aria-hidden="true" /></>;

  if (href) {
    return (
      <Button asChild variant="ghost" size="sm" className={className} tooltip={`Sort by ${label}`}>
        <Link href={href} aria-label={`Sort by ${label}`}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      tooltip={`Sort by ${label}`}
      aria-label={`Sort by ${label}`}
      onClick={onClick}
    >
      {content}
    </Button>
  );
}
