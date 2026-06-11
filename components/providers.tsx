"use client";

import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";

export function Providers() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    window.localStorage.removeItem("vibe-grader-theme");
  }, []);

  return <Toaster richColors position="top-right" />;
}
