import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { Providers } from "@/components/providers";
import { RootLayoutClient } from "@/components/root-layout-client";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Codetice",
  description: "Python coding grader with local auth, admin authoring, and testcase-based scoring.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentUser();

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers />
        <RootLayoutClient user={session}>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
