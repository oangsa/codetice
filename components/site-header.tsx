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
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#08101d]/88 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 text-sm font-semibold text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <Code2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300/75">Contest Workspace</div>
              <span className="block truncate text-sm">Vibe Grader</span>
            </div>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.href}
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-9 rounded-md border border-transparent px-3 text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white"
                  >
                    <Link href={link.href}>
                      <Icon className="h-4 w-4" />
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
                  className="h-9 rounded-md border border-amber-300/15 bg-amber-400/8 px-3 text-amber-200 hover:bg-amber-400/14"
                >
                  <Link href="/admin">Admin</Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Badge
                variant={user.role === "admin" ? "warning" : "info"}
                className="border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
              >
                {user.role === "admin" ? <Shield className="mr-1 h-3 w-3" /> : <Trophy className="mr-1 h-3 w-3" />}
                {user.role}
              </Badge>
              <UserMenu user={user} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:bg-white/6 hover:text-white">
                <Link href="/login">Login</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
              >
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      {user ? (
        <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-4 pb-3 lg:hidden sm:px-6 lg:px-8">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              asChild
              className="h-8 rounded-md border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/7 hover:text-white"
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {user.role === "admin" ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 rounded-md border border-amber-300/15 bg-amber-400/8 text-amber-200 hover:bg-amber-400/14"
            >
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
