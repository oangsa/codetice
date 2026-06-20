"use client";

import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";

export function Providers() {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("codetice-theme") || "light";
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
