"use client";

import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/user-menu";
import type { SessionUser } from "@/lib/types";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-white/80 dark:bg-[#0d0e12]/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-3">
        {/* Left — logo + nav */}
        <div className="flex min-w-0 items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-sky-600">
              <Image src="/icon.png" alt="Codetice" width={36} height={36} className="h-9 w-9 object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Codetice</span>
          </Link>
        </div>
 
        {/* Right — user menu pill */}
        <div className="flex items-center gap-3">
          {user ? <UserMenu user={user} /> : null}
        </div>
      </div>
    </header>
  );
}

