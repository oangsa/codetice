"use client";

import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { THEME_COOKIE_MAX_AGE, THEME_COOKIE_NAME, THEME_STORAGE_KEY } from "@/lib/theme";

export function Providers() {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) || "light";
    document.cookie = `${THEME_COOKIE_NAME}=${savedTheme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  return <Toaster richColors position="bottom-right" />;
}
