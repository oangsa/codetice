"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import type { SessionUser } from "@/lib/types";

export function RootLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const isAuthPage = ["/login", "/register", "/reset-password"].includes(pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && <SiteHeader user={user} />}
      <main className={`mx-auto flex w-full flex-grow flex-col px-4 pb-6 sm:px-6 lg:px-8 ${isAuthPage ? "pt-0" : "pt-20"}`}>
        {children}
      </main>
    </div>
  );
}
