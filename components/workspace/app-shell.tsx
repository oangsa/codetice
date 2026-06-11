"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  Code2,
  FileCode2,
  Home,
  Shield,
  Trophy,
} from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles?: Array<SessionUser["role"]>;
};

type NavSection = {
  label: string;
  items: NavItem[];
  roles?: Array<SessionUser["role"]>;
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/classrooms", label: "Classrooms", icon: Home },
      { href: "/questions", label: "Questions", icon: BookOpen },
      { href: "/submissions", label: "Submissions", icon: ClipboardList },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Administration",
    roles: ["admin"],
    items: [
      { href: "/admin", label: "Overview", icon: Shield, roles: ["admin"] },
      { href: "/admin/questions", label: "Question Bank", icon: FileCode2, roles: ["admin"] },
    ],
  },
];

const AUTH_ROUTES = new Set(["/login", "/register"]);

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getVisibleSections(role: SessionUser["role"] | undefined) {
  if (!role) {
    return [];
  }

  return NAV_SECTIONS.filter((section) => !section.roles || section.roles.includes(role)).map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  }));
}

function getPageTitle(pathname: string, role: SessionUser["role"] | undefined) {
  const activeItem = getVisibleSections(role)
    .flatMap((section) => section.items)
    .find((item) => isActivePath(pathname, item.href));

  return activeItem?.label ?? "Workspace";
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (!user || AUTH_ROUTES.has(pathname)) {
    return <main className="min-h-screen">{children}</main>;
  }

  const sections = getVisibleSections(user.role);
  const pageTitle = getPageTitle(pathname, user.role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-slate-200 px-4">
            <Link href="/classrooms" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Code2 className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Contest Workspace
                </span>
                <span className="block truncate text-base font-semibold text-slate-900">
                  Vibe Grader
                </span>
              </span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            {sections.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {section.label}
                </p>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{user.role}</p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white lg:hidden">
                  <Code2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Vibe Grader
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                    {pageTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={user.role === "admin" ? "warning" : "default"} className="hidden capitalize sm:inline-flex">
                  {user.role}
                </Badge>
                <UserMenu user={user} />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 lg:hidden sm:px-6">
              {sections.flatMap((section) => section.items).map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Button
                    key={item.href}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    asChild
                    className="h-8 shrink-0 rounded-md"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                );
              })}
            </div>
          </header>

          <main className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
