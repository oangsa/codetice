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
      <main className={`mx-auto w-full max-w-[1440px] px-4 pb-6 sm:px-6 lg:px-8 flex-grow flex flex-col ${isAuthPage ? "pt-0" : "pt-20"}`}>
        {children}
      </main>
    </div>
  );
}
