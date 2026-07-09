import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

import { Providers } from "@/components/providers";
import { RootLayoutClient } from "@/components/root-layout-client";
import { getCurrentUser } from "@/lib/auth";
import { normalizeThemePreference, THEME_COOKIE_NAME, THEME_STORAGE_KEY } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Codetice",
  description: "Python coding grader with local auth, admin authoring, and testcase-based scoring.",
};

const themeScript = `
(() => {
  try {
    const cookieTheme = document.cookie
      .split("; ")
      .find((item) => item.startsWith("${THEME_COOKIE_NAME}="))
      ?.split("=")[1];
    const theme = cookieTheme || window.localStorage.getItem("${THEME_STORAGE_KEY}") || "light";
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const theme = normalizeThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      className={`${inter.variable}${isDark ? " dark" : ""}`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers />
        <RootLayoutClient user={session}>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
