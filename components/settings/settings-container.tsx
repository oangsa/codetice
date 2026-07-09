"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, X } from "lucide-react";

import { ProfileDetailsForm } from "@/components/auth/profile-details-form";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import type { ThemePreference } from "@/lib/theme";
import type { SessionUser } from "@/lib/types";

export function SettingsContainer({
  session,
  initialTheme,
}: {
  session: SessionUser;
  initialTheme: ThemePreference;
}) {
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      router.push("/login");
      router.refresh();
    } else {
      setLoggingOut(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Section: Account */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Account
        </span>
        <div className="rounded-[30px] border bg-[var(--tint-sm)] p-2 shadow-sm">
          <ProfileDetailsForm user={session} />
        </div>
      </div>

      {/* Section: Security */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Security
        </span>
        <div className="rounded-[30px] border bg-[var(--tint-sm)] overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex w-full h-[58px] items-center justify-between pl-4 pr-4 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Update Password</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${showPasswordForm ? "rotate-90" : ""
                }`}
            />
          </button>

          {showPasswordForm && (
            <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50 dark:bg-slate-900/30">
              <ChangePasswordForm onCancel={() => setShowPasswordForm(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Section: Appearance */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Appearance
        </span>
        <div className="rounded-full border bg-[var(--tint-sm)] h-[58px] pl-4 pr-2 shadow-sm flex items-center justify-between gap-4 border-slate-200 dark:border-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Theme
          </h3>
          <ThemeToggle initialTheme={initialTheme} />
        </div>
      </div>

      {/* Logout Button */}
      <div className="pt-6 text-left border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-red-500 dark:text-red-400 font-bold hover:text-red-600 dark:hover:text-red-300 cursor-pointer disabled:opacity-50 text-sm transition-colors py-2 px-1 inline-block"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}
