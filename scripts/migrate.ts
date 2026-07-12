import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

const migrationsFolder = resolve(import.meta.dir, "../db/migrations");
const client = postgres(connectionString, { max: 1, prepare: false });
const db = drizzle(client);

async function ensureMigrationTable() {
  await client`create schema if not exists drizzle`;
  await client`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;
}

async function adoptDatabaseBaseline() {
  const migrations = readMigrationFiles({ migrationsFolder });
  const workspaceRenameIndex = migrations.findIndex((migration) =>
    migration.sql.some((statement) => statement.includes('RENAME TO "workspace_members"')),
  );
  if (workspaceRenameIndex === -1) {
    throw new Error("The checked-in workspace rename migration is missing.");
  }
  const assignmentRemovalIndex = migrations.findIndex((migration) =>
    migration.sql.some((statement) => statement.includes('DROP TABLE "assignment_questions"')),
  );
  if (assignmentRemovalIndex === -1) {
    throw new Error("The checked-in assignment removal migration is missing.");
  }
  const sandboxJobsIndex = migrations.findIndex((migration) =>
    migration.sql.some((statement) => statement.includes('CREATE TABLE "sandbox_jobs"')),
  );
  if (sandboxJobsIndex === -1) {
    throw new Error("The checked-in sandbox jobs migration is missing.");
  }

  const [state] = await client<
    Array<{
      questions_table: string | null;
      has_classroom_ownership: boolean;
      has_workspace_ownership: boolean;
      classroom_schema_complete: boolean;
      workspace_assignment_schema_complete: boolean;
      workspace_pre_sandbox_schema_complete: boolean;
      workspace_schema_complete: boolean;
    }>
  >`
    select
      to_regclass('public.questions')::text as questions_table,
      exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'classroom_id') as has_classroom_ownership,
      exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'workspace_id') as has_workspace_ownership,
      (
        to_regclass('public.classrooms') is not null
        and to_regclass('public.classroom_members') is not null
        and to_regclass('public.submission_runs') is not null
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'classroom_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assignments' and column_name = 'classroom_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assignment_questions' and column_name = 'classroom_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rejudge_jobs' and column_name = 'classroom_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'latest_run_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'testcase_results' and column_name = 'submission_run_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'grading_jobs' and column_name = 'submission_run_id')
      ) as classroom_schema_complete,
      (
        to_regclass('public.workspaces') is not null
        and to_regclass('public.workspace_members') is not null
        and to_regclass('public.submission_runs') is not null
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assignments' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assignment_questions' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rejudge_jobs' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'latest_run_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'testcase_results' and column_name = 'submission_run_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'grading_jobs' and column_name = 'submission_run_id')
      ) as workspace_assignment_schema_complete,
      (
        to_regclass('public.workspaces') is not null
        and to_regclass('public.workspace_members') is not null
        and to_regclass('public.submission_runs') is not null
        and to_regclass('public.assignments') is null
        and to_regclass('public.assignment_questions') is null
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rejudge_jobs' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'latest_run_id')
        and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'assignment_id')
        and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'is_late')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'testcase_results' and column_name = 'submission_run_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'grading_jobs' and column_name = 'submission_run_id')
      ) as workspace_pre_sandbox_schema_complete,
      (
        to_regclass('public.workspaces') is not null
        and to_regclass('public.workspace_members') is not null
        and to_regclass('public.submission_runs') is not null
        and to_regclass('public.sandbox_jobs') is not null
        and to_regclass('public.assignments') is null
        and to_regclass('public.assignment_questions') is null
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rejudge_jobs' and column_name = 'workspace_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'latest_run_id')
        and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'assignment_id')
        and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'submissions' and column_name = 'is_late')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'testcase_results' and column_name = 'submission_run_id')
        and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'grading_jobs' and column_name = 'submission_run_id')
      ) as workspace_schema_complete
  `;

  if (!state?.questions_table) {
    return;
  }

  await ensureMigrationTable();

  const [lastApplied] = await client<Array<{ created_at: string | null }>>`
    select created_at::text
    from drizzle.__drizzle_migrations
    order by created_at desc
    limit 1
  `;

  if (lastApplied) {
    if (migrations.some((migration) => lastApplied.created_at === String(migration.folderMillis))) return;
    throw new Error(
      "Database has an unknown Drizzle migration history; refusing ambiguous adoption.",
    );
  }

  const recordThrough = async (exclusiveIndex: number, message: string) => {
    for (const migration of migrations.slice(0, exclusiveIndex)) {
      await client`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${migration.hash}, ${migration.folderMillis})
      `;
    }
    console.info(message);
  };

  if (state.workspace_schema_complete) {
    await recordThrough(migrations.length, "Adopted the verified workspace schema at the current migration version.");
    return;
  }

  if (state.workspace_pre_sandbox_schema_complete) {
    await recordThrough(sandboxJobsIndex, "Adopted the verified workspace schema before sandbox jobs.");
    return;
  }

  if (state.workspace_assignment_schema_complete) {
    await recordThrough(assignmentRemovalIndex, "Adopted the verified workspace schema before assignment removal.");
    return;
  }

  if (state.classroom_schema_complete) {
    await recordThrough(workspaceRenameIndex, "Adopted the verified classroom schema before the workspace rename.");
    return;
  }

  if (state.has_classroom_ownership || state.has_workspace_ownership) {
    throw new Error("Database has a partial ownership schema; refusing ambiguous migration adoption.");
  }

  const [baseline] = migrations;
  if (!baseline) throw new Error("The checked-in Drizzle baseline migration is missing.");
  await recordThrough(1, "Adopted the existing Codetice legacy schema at the checked-in baseline.");
}

try {
  await adoptDatabaseBaseline();
  await migrate(db, { migrationsFolder });
  console.info("Database migrations completed.");
} finally {
  await client.end();
}
