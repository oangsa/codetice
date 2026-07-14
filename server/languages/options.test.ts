import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";

import { supportedLanguages } from "@/db/schema";
import {
  enabledLanguageOptionColumns,
  enabledLanguageOptionsWhere,
} from "@/server/languages/options";

describe("question authoring language options", () => {
  test("lists minimal enabled options without hiding pending runtimes", () => {
    const query = drizzle.mock()
      .select(enabledLanguageOptionColumns)
      .from(supportedLanguages)
      .where(enabledLanguageOptionsWhere())
      .toSQL().sql;

    expect(query).toContain('"id", "name", "slug"');
    expect(query).toContain('"is_enabled" = $1');
    expect(query).not.toContain("runtime_status");
    expect(query).not.toContain("docker_image");
    expect(query).not.toContain("run_command");
  });

  test("finds an enabled runtime by slug without requiring prior image preparation", () => {
    const query = drizzle.mock()
      .select(enabledLanguageOptionColumns)
      .from(supportedLanguages)
      .where(enabledLanguageOptionsWhere("python"))
      .toSQL();

    expect(query.sql).toContain('"is_enabled" = $1');
    expect(query.sql).toContain('"slug" = $2');
    expect(query.sql).not.toContain("runtime_status");
    expect(query.params).toEqual([true, "python"]);
  });
});
