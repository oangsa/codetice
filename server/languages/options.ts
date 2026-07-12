import { and, eq } from "drizzle-orm";

import { supportedLanguages } from "@/db/schema";

export const enabledLanguageOptionColumns = {
  id: supportedLanguages.id,
  name: supportedLanguages.name,
  slug: supportedLanguages.slug,
};

export function enabledLanguageOptionsWhere(slug?: string) {
  return and(
    eq(supportedLanguages.isEnabled, true),
    slug ? eq(supportedLanguages.slug, slug) : undefined,
  );
}
