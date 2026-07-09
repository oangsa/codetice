import { cookies } from "next/headers";

import { requireCurrentUser } from "@/lib/auth";
import { SettingsContainer } from "@/components/settings/settings-container";
import { normalizeThemePreference, THEME_COOKIE_NAME } from "@/lib/theme";

export const metadata = {
  title: "Settings | Codetice",
  description: "Manage your account settings.",
};

export default async function SettingsPage() {
  const [session, cookieStore] = await Promise.all([requireCurrentUser(), cookies()]);
  const initialTheme = normalizeThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return <SettingsContainer session={session} initialTheme={initialTheme} />;
}
