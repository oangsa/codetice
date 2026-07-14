import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("workspace ownership migration contract", () => {
  test("records approved deletion cases, count assertions, and unmapped-row aborts", async () => {
    const sql = await readFile(new URL("./migrations/0001_adopt_legacy_classrooms.sql", import.meta.url), "utf8");
    expect(sql).toContain("_approved_submission_deletes");
    expect(sql).toContain("assignment submission does not reference a question in that assignment");
    expect(sql).toContain("testcase result could not be mapped");
    expect(sql).toContain("question count mismatch");
    expect(sql).toContain("WHERE m.new_question_id = q.id");
    expect(sql).toContain("Codetice migration counts: submissions");
  });

  test("creates initial immutable runs and rebuilds ranked scores", async () => {
    const sql = await readFile(new URL("./migrations/0001_adopt_legacy_classrooms.sql", import.meta.url), "utf8");
    expect(sql).toContain("INSERT INTO submission_runs");
    expect(sql).toContain("latest_scored_run_id");
    expect(sql).toContain("DELETE FROM question_scores");
    expect(sql).toContain("WHERE s.is_ranked");
    expect(sql).toContain("LEFT JOIN submission_runs sr ON sr.id = s.latest_scored_run_id");
    expect(sql).toContain("count(*)::integer");
    expect(sql).toContain("DROP TABLE IF EXISTS leaderboards");
  });

  test("keeps cyclic run pointers insertable and cascade-deletable", async () => {
    const sql = await readFile(new URL("./migrations/0002_deferred-submission-run-pointers.sql", import.meta.url), "utf8");
    expect(sql).toContain("ON DELETE no action");
    expect(sql.match(/DEFERRABLE INITIALLY DEFERRED/g)).toHaveLength(2);
    expect(sql).not.toContain("ON DELETE restrict");
  });

  test("renames classroom storage to workspace storage without dropping data tables", async () => {
    const sql = await readFile(new URL("./migrations/0003_rename-classroom-to-workspace.sql", import.meta.url), "utf8");
    expect(sql).toContain('ALTER TABLE "classroom_members" RENAME TO "workspace_members"');
    expect(sql).toContain('ALTER TABLE "classrooms" RENAME TO "workspaces"');
    expect(sql.match(/RENAME COLUMN "classroom_id" TO "workspace_id"/g)).toHaveLength(5);
    expect(sql).toContain('questions_workspace_slug_unique');
    expect(sql).toContain('workspace_members_role_check');
  });

  test("tolerates legacy schemas that omitted replaceable workspace indexes or constraints", async () => {
    const sql = await readFile(new URL("./migrations/0003_rename-classroom-to-workspace.sql", import.meta.url), "utf8");
    const teardownStatements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.startsWith("DROP INDEX") || statement.includes(" DROP CONSTRAINT "));

    expect(teardownStatements.length).toBeGreaterThan(0);
    for (const statement of teardownStatements) {
      expect(statement).toContain("IF EXISTS");
    }
  });

  test("creates composite workspace keys before foreign keys reference them", async () => {
    const sql = await readFile(new URL("./migrations/0003_rename-classroom-to-workspace.sql", import.meta.url), "utf8");

    expect(sql.indexOf('CREATE UNIQUE INDEX "assignments_workspace_id_id_unique"'))
      .toBeLessThan(sql.indexOf('ADD CONSTRAINT "assignment_questions_assignment_workspace_fk"'));
    expect(sql.indexOf('CREATE UNIQUE INDEX "questions_workspace_id_id_unique"'))
      .toBeLessThan(sql.indexOf('ADD CONSTRAINT "assignment_questions_question_workspace_fk"'));
  });

  test("removes the legacy assignment domain after workspace ownership is established", async () => {
    const sql = await readFile(new URL("./migrations/0004_remove_assignments.sql", import.meta.url), "utf8");
    const submissionConstraint = sql.indexOf('DROP CONSTRAINT IF EXISTS "submissions_assignment_id_assignments_id_fk"');
    const questionLinks = sql.indexOf('DROP TABLE "assignment_questions"');
    const containers = sql.indexOf('DROP TABLE "assignments"');

    expect(submissionConstraint).toBeGreaterThanOrEqual(0);
    expect(submissionConstraint).toBeLessThan(questionLinks);
    expect(questionLinks).toBeLessThan(containers);
    expect(sql).toContain('DROP COLUMN "assignment_id"');
    expect(sql).toContain('DROP COLUMN "is_late"');
    expect(sql).not.toContain("CASCADE");
  });

  test("adds scoped tags, question mappings, and every shared teaching preset", async () => {
    const sql = await readFile(new URL("./migrations/0006_workspace-tags.sql", import.meta.url), "utf8");
    expect(sql).toContain('CREATE TABLE "tags"');
    expect(sql).toContain('CREATE TABLE "question_tags"');
    expect(sql).toContain('tags_global_slug_unique');
    expect(sql).toContain('tags_workspace_slug_unique');
    expect(sql).toContain('question_tags_tag_question_idx');
    expect(sql).toContain("'Arrays', 'arrays'");
    expect(sql).toContain("'Stack/Queue', 'stack-queue'");
    expect(sql).toContain("'Dynamic Programming', 'dynamic-programming'");
    expect(sql).not.toContain('CREATE TABLE "sandbox_jobs"');
  });

  test("adopts sandbox-era schemas through the migration immediately before tags", async () => {
    const migrationRunner = await readFile(new URL("../scripts/migrate.ts", import.meta.url), "utf8");
    expect(migrationRunner).toContain("workspace_pre_tags_schema_complete");
    expect(migrationRunner).toContain("recordThrough(tagsIndex");
    expect(migrationRunner).toContain("before workspace tags");
    expect(migrationRunner).toContain("to_regclass('public.tags') is null");
  });

  test("migrates legacy workspace creators into required owners before dropping the old column", async () => {
    const sql = await readFile(new URL("./migrations/0007_young_eternals.sql", import.meta.url), "utf8");
    const migrationRunner = await readFile(new URL("../scripts/migrate.ts", import.meta.url), "utf8");

    expect(sql).toContain('ADD COLUMN "owner_id" uuid');
    expect(sql).toContain('SET "owner_id" = "created_by"');
    expect(sql).toContain("fallback_owner_id");
    expect(sql).toContain("Cannot migrate workspace ownership");
    expect(sql.indexOf('ALTER COLUMN "owner_id" SET NOT NULL')).toBeLessThan(sql.indexOf('DROP COLUMN "created_by"'));
    expect(migrationRunner).toContain("workspace_owner_schema_complete");
    expect(migrationRunner).toContain("before workspace ownership");
    expect(migrationRunner).toContain("partial workspace ownership schema");
  });
});
