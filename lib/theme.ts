export const THEME_COOKIE_NAME = "codetice-theme";
export const THEME_STORAGE_KEY = "codetice-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemePreference = "light" | "dark";

export function normalizeThemePreference(value: string | undefined | null): ThemePreference {
  return value === "dark" ? "dark" : "light";
}
