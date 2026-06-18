"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hasClicked, setHasClicked] = useState(false);

  useEffect(() => {
    const activeTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(activeTheme);
  }, []);

  function handleThemeChange(newTheme: "light" | "dark") {
    if (newTheme === theme) return;

    setHasClicked(true);
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      window.localStorage.setItem("codetice-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      window.localStorage.setItem("codetice-theme", "light");
    }
  }

  const activeIndex = theme === "light" ? 0 : 1;

  const indicatorStyle: React.CSSProperties = {
    "--active-width": "calc((100% - 6px) / 2)",
    left: `calc(2px + ((100% - 6px) / 2 + 2px) * ${activeIndex})`,
    width: `calc((100% - 6px) / 2)`,
    height: `36px`,
    top: `2px`,
    transition: "left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  } as React.CSSProperties;

  const indicatorClass = cn(
    "absolute rounded-full bg-[var(--tint-sm)] pointer-events-none h-[36px] top-[2px]",
    hasClicked && (theme === "light" ? "animate-rubber-light" : "animate-rubber-dark")
  );

  return (
    <div
      className="w-full max-w-[260px] h-[42px] rounded-full bg-white dark:bg-[#0d0e12] p-[2px] relative flex items-center gap-[2px] select-none cursor-pointer border border-black/5 dark:border-white/5"
    >
      {/* Sliding and Squeezing Indicator */}
      <div
        className={indicatorClass}
        style={indicatorStyle}
      />

      <button
        type="button"
        onClick={() => handleThemeChange("light")}
        className={cn(
          "relative z-10 flex h-[36px] flex-1 items-center justify-center gap-2 text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
          theme === "light"
            ? "text-slate-950 dark:text-white"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Sun className="h-4 w-4" />
        Light
      </button>

      <button
        type="button"
        onClick={() => handleThemeChange("dark")}
        className={cn(
          "relative z-10 flex h-[36px] flex-1 items-center justify-center gap-2 text-sm font-semibold rounded-full cursor-pointer transition-colors duration-200",
          theme === "dark"
            ? "text-slate-950 dark:text-white"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Moon className="h-4 w-4" />
        Dark
      </button>
    </div>
  );
}

