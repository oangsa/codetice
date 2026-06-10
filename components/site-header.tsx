import Link from "next/link";
import { Code2, LayoutDashboard, ListChecks, Shield, Trophy, Users } from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/types";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/questions", label: "Problems", icon: Code2 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/classrooms", label: "Classrooms", icon: Users },
  { href: "/assignments", label: "Assignments", icon: ListChecks },
  { href: "/submissions", label: "Submissions", icon: Shield },
];

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Code2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Contest Workspace</div>
              <span className="block truncate text-sm font-semibold text-slate-900">Vibe Grader</span>
            </div>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.href}
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 rounded-md px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Link href={link.href}>
                      <Icon className="h-3.5 w-3.5" />
                      {link.label}
                    </Link>
                  </Button>
                );
              })}
              {user.role === "admin" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 rounded-md bg-amber-50 px-3 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                >
                  <Link href="/admin">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Badge
                variant={user.role === "admin" ? "warning" : "default"}
                className="capitalize"
              >
                {user.role}
              </Badge>
              <UserMenu user={user} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      {user ? (
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden sm:px-6 lg:px-8">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              asChild
              className="h-7 shrink-0 rounded-md px-2.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {user.role === "admin" ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 shrink-0 rounded-md bg-amber-50 px-2.5 text-xs text-amber-700 hover:bg-amber-100"
            >
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
