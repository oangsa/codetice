"use client";

import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const checked = resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
      <div className="flex items-center gap-2">
        {checked ? (
          <Moon className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        ) : (
          <Sun className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        )}
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Dark mode</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Toggle workspace theme
          </p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
    </div>
  );
}
