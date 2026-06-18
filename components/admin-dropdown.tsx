"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  ChevronDown,
  Languages,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  {
    label: "Languages",
    href: "/admin/languages",
    icon: Languages,
    description: "Runtime configurations",
    exact: false,
  },
] as const;

export function AdminDropdown() {
  const pathname = usePathname();

  const isActive = ADMIN_NAV_ITEMS.some((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          // Base
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none transition-colors",
          // Idle
          "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/30",
          // Active (we're somewhere inside /admin)
          isActive && "bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800/80",
          // Focus-visible ring
          "focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1",
        )}
      >
        <Shield className="h-3.5 w-3.5" />
        Admin
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-64 p-1.5"
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-amber-600" />
          Administration
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors",
                    active
                      ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      active
                        ? "bg-amber-200/60 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-none">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
