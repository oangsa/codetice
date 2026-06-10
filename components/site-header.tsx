import Link from "next/link";
import { Code2, Shield, Trophy } from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/types";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Code2 className="h-5 w-5 text-sky-600" />
            <span>Vibe Grader</span>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/questions">Questions</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/leaderboard">Leaderboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/classrooms">Classrooms</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/assignments">Assignments</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/submissions">Submissions</Link>
              </Button>
              {user.role === "admin" ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">Admin</Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Badge variant={user.role === "admin" ? "warning" : "info"}>
                {user.role === "admin" ? <Shield className="mr-1 h-3 w-3" /> : <Trophy className="mr-1 h-3 w-3" />}
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
    </header>
  );
}
