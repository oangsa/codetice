import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationRunner = readFileSync(resolve(process.cwd(), "scripts/migrate.ts"), "utf8");

describe("migration adoption safety", () => {
  test("distinguishes a pre-sandbox schema from any partial sandbox table", () => {
    expect(migrationRunner).toContain("to_regclass('public.sandbox_jobs') is null");
  });

  test("verifies required sandbox columns before adopting the current schema", () => {
    for (const column of ["source_code", "result", "expires_at"]) {
      expect(migrationRunner).toContain(`table_name = 'sandbox_jobs' and column_name = '${column}'`);
    }
    expect(migrationRunner).toContain("column_name = 'expires_at' and is_nullable = 'NO'");
    for (const constraint of [
      "sandbox_jobs_pkey",
      "sandbox_jobs_workspace_id_workspaces_id_fk",
      "sandbox_jobs_question_id_questions_id_fk",
      "sandbox_jobs_requested_by_users_id_fk",
      "sandbox_jobs_kind_check",
      "sandbox_jobs_status_check",
    ]) {
      expect(migrationRunner).toContain(`conname = '${constraint}'`);
    }
    for (const index of [
      "sandbox_jobs_status_lease_created_idx",
      "sandbox_jobs_requester_created_idx",
      "sandbox_jobs_status_expires_idx",
    ]) {
      expect(migrationRunner).toContain(`to_regclass('public.${index}') is not null`);
    }
  });
});
