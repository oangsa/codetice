"use client";

import { Toaster } from "sonner";

import { ThemeProvider, useTheme } from "@/components/theme-provider";

function AppToaster() {
  const { resolvedTheme } = useTheme();

  return <Toaster richColors position="top-right" theme={resolvedTheme} />;
}

export function Providers() {
  return (
    <ThemeProvider>
      <AppToaster />
    </ThemeProvider>
  );
}
