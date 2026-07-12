import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname.toLowerCase() : "";
const runIntegration = process.env.RUN_DATABASE_INTEGRATION === "true"
  && Boolean(testDatabaseUrl)
  && testDatabaseUrl !== process.env.DATABASE_URL
  && testDatabaseName.includes("test");
const suite = runIntegration ? describe : describe.skip;

suite("legacy ownership migration reaches the workspace schema", () => {
  let client!: ReturnType<typeof postgres>;

  beforeAll(async () => {
    client = postgres(testDatabaseUrl!, { max: 1, prepare: false });
    await client.unsafe(`
      drop schema if exists drizzle cascade;
      drop schema if exists public cascade;
      create schema public;
      create extension if not exists pgcrypto;

      create table users (
        id uuid primary key, username varchar(50) unique not null, password_hash text not null,
        role varchar(20) not null, profile_picture varchar(255) not null,
        token_version integer not null default 0, created_at timestamp not null default now(), updated_at timestamp not null default now()
      );
      create table classrooms (
        id uuid primary key, name varchar(255) not null, invite_code varchar(50) unique not null,
        created_by uuid references users(id), created_at timestamp not null default now()
      );
      create table classroom_members (
        id uuid primary key, classroom_id uuid not null references classrooms(id) on delete cascade,
        user_id uuid not null references users(id) on delete cascade, role varchar(20) not null,
        joined_at timestamp not null default now(), unique(classroom_id, user_id)
      );
      create table questions (
        id uuid primary key, title varchar(255) not null, slug varchar(255) unique not null,
        description text not null, difficulty varchar(20) not null default 'easy', total_score numeric(10,2) not null default 100,
        time_limit_ms integer not null default 2000, memory_limit_mb integer not null default 128,
        starter_code text, starter_code_by_language text, allowed_languages text,
        is_published boolean not null default false, created_by uuid references users(id),
        created_at timestamp not null default now(), updated_at timestamp not null default now()
      );
      create table assignments (
        id uuid primary key, classroom_id uuid references classrooms(id) on delete cascade,
        title varchar(255) not null, description text, start_at timestamp, due_at timestamp,
        created_at timestamp not null default now()
      );
      create table assignment_questions (
        id uuid primary key, assignment_id uuid not null references assignments(id) on delete cascade,
        question_id uuid not null references questions(id) on delete cascade, sort_order integer not null default 0,
        unique(assignment_id, question_id)
      );
      create table testcases (
        id uuid primary key, question_id uuid not null references questions(id) on delete cascade,
        name varchar(255), input text not null, expected_output text not null,
        is_sample boolean not null default false, is_hidden boolean not null default true,
        checker_type varchar(50) not null default 'exact', float_tolerance numeric(20,10),
        sort_order integer not null default 0, created_at timestamp not null default now(), updated_at timestamp not null default now()
      );
      create table submissions (
        id uuid primary key, user_id uuid not null references users(id) on delete cascade,
        question_id uuid not null references questions(id) on delete cascade,
        assignment_id uuid references assignments(id) on delete set null, language varchar(50) not null default 'python',
        source_code text not null, status varchar(30) not null, passed_count integer not null default 0,
        total_count integer not null default 0, score numeric(10,2) not null default 0,
        runtime_ms integer, memory_kb integer, error_message text, is_late boolean not null default false,
        created_at timestamp not null default now()
      );
      create table testcase_results (
        id uuid primary key, submission_id uuid not null references submissions(id) on delete cascade,
        testcase_id uuid not null references testcases(id) on delete cascade, status varchar(30) not null,
        actual_output text, expected_output text, error_message text, runtime_ms integer, memory_kb integer,
        passed boolean not null default false, created_at timestamp not null default now()
      );
      create table question_scores (
        id uuid primary key, user_id uuid not null references users(id) on delete cascade,
        question_id uuid not null references questions(id) on delete cascade,
        best_submission_id uuid references submissions(id), best_score numeric(10,2) not null default 0,
        attempts integer not null default 0, updated_at timestamp not null default now(), unique(user_id, question_id)
      );
      create table grading_jobs (
        id uuid primary key, submission_id uuid not null references submissions(id) on delete cascade,
        status varchar(30) not null default 'queued', attempts integer not null default 0,
        locked_by varchar(255), lease_expires_at timestamp, error_message text,
        created_at timestamp not null default now(), started_at timestamp, completed_at timestamp
      );
      create table rejudge_jobs (
        id uuid primary key, question_id uuid references questions(id) on delete cascade,
        requested_by uuid references users(id), status varchar(30) not null default 'queued',
        created_at timestamp not null default now(), completed_at timestamp
      );
      create table custom_checkers (
        id uuid primary key, question_id uuid not null references questions(id) on delete cascade,
        language varchar(50) not null default 'python', source_code text not null,
        created_at timestamp not null default now(), updated_at timestamp not null default now()
      );
      create table supported_languages (
        id uuid primary key, name varchar(100) not null, slug varchar(50) unique not null,
        docker_image varchar(255) not null, file_extension varchar(20) not null, build_command text,
        run_command text not null, editor_language varchar(50) not null default 'plaintext',
        diagnostics_format varchar(30) not null default 'none', diagnostics_command text,
        default_starter_code text, is_enabled boolean not null default true
      );
      create table leaderboards (id uuid primary key, user_id uuid not null references users(id), total_score numeric(10,2), solved_count integer, updated_at timestamp);
      create table password_reset_tokens (id uuid primary key, user_id uuid not null references users(id), token_hash text not null, expires_at timestamp not null, used_at timestamp, created_at timestamp not null default now());
      create table idempotency_keys (id uuid primary key default gen_random_uuid(), identifier varchar(255) not null, action varchar(100) not null, key varchar(100) not null, request_hash text not null, response_status integer, response_body text, created_at timestamp not null default now(), completed_at timestamp);
      create table rate_limits (id uuid primary key default gen_random_uuid(), identifier varchar(255) not null, action varchar(100) not null, count integer not null default 1, window_start timestamp not null default now());

      insert into users values
        ('00000000-0000-0000-0000-000000000001','admin','x','admin',repeat('a',255),0,now(),now()),
        ('00000000-0000-0000-0000-000000000002','student','x','student','/avatar',0,now(),now()),
        ('00000000-0000-0000-0000-000000000003','teacher','x','student','/avatar',0,now(),now());
      insert into classrooms values
        ('00000000-0000-0000-0000-000000000101','One','ONE','00000000-0000-0000-0000-000000000001',now()),
        ('00000000-0000-0000-0000-000000000102','Two','TWO','00000000-0000-0000-0000-000000000001',now());
      insert into classroom_members values
        ('00000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000002','student',now()),
        ('00000000-0000-0000-0000-000000000112','00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000002','student',now()),
        ('00000000-0000-0000-0000-000000000113','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000003','teacher',now());
      insert into questions values
        ('00000000-0000-0000-0000-000000000201','Single','single','d','easy',100,2000,128,'','','["python"]',true,'00000000-0000-0000-0000-000000000001',now(),now()),
        ('00000000-0000-0000-0000-000000000202','Multi','multi','d','easy',100,2000,128,'','','["python"]',true,'00000000-0000-0000-0000-000000000001',now(),now()),
        ('00000000-0000-0000-0000-000000000203','Orphan','orphan','d','easy',100,2000,128,'','','["python"]',true,'00000000-0000-0000-0000-000000000001',now(),now());
      insert into assignments values
        ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000101','Single',null,null,null,now()),
        ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000101','Multi One',null,null,null,now()),
        ('00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000102','Multi Two',null,null,null,now());
      insert into assignment_questions values
        ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000201',0),
        ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000202',0),
        ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000202',0);
      insert into testcases values
        ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000201','One','','ok',true,false,'exact',null,0,now(),now()),
        ('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000202','Multi','','ok',false,true,'exact',null,0,now(),now()),
        ('00000000-0000-0000-0000-000000000503','00000000-0000-0000-0000-000000000203','Orphan','','ok',false,true,'exact',null,0,now(),now());
      insert into submissions values
        ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000301','python','x','accepted',1,1,100,1,null,null,false,now()),
        ('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000302','python','x','accepted',1,1,100,1,null,null,false,now()),
        ('00000000-0000-0000-0000-000000000603','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000303','python','x','wrong_answer',0,1,0,1,null,null,false,now()),
        ('00000000-0000-0000-0000-000000000604','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000202',null,'python','x','accepted',1,1,100,1,null,null,false,now()),
        ('00000000-0000-0000-0000-000000000605','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000203',null,'python','x','accepted',1,1,100,1,null,null,false,now()),
        ('00000000-0000-0000-0000-000000000606','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000201',null,'python','x','accepted',1,1,100,1,null,null,false,now()),
        ('00000000-0000-0000-0000-000000000607','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000201',null,'python','x','accepted',1,1,100,1,null,null,false,now());
      insert into testcase_results
      select ('00000000-0000-0000-0000-' || lpad((700 + n)::text, 12, '0'))::uuid,
        ('00000000-0000-0000-0000-' || lpad((600 + n)::text, 12, '0'))::uuid,
        case when n in (2,3,4) then '00000000-0000-0000-0000-000000000502'::uuid when n = 5 then '00000000-0000-0000-0000-000000000503'::uuid else '00000000-0000-0000-0000-000000000501'::uuid end,
        'accepted','ok','ok',null,1,null,true,now()
      from generate_series(1,7) n;
      insert into grading_jobs
      select ('00000000-0000-0000-0000-' || lpad((800 + n)::text, 12, '0'))::uuid,
        ('00000000-0000-0000-0000-' || lpad((600 + n)::text, 12, '0'))::uuid,
        'completed',1,null,null,null,now(),now(),now()
      from generate_series(1,7) n;
      insert into question_scores values ('00000000-0000-0000-0000-000000000901','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000601',100,99,now());
      insert into leaderboards values ('00000000-0000-0000-0000-000000000902','00000000-0000-0000-0000-000000000002',999,99,now());
      insert into rejudge_jobs values ('00000000-0000-0000-0000-000000000903','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000001','queued',now(),null);
    `);

    const child = Bun.spawn(["bun", "scripts/migrate.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testDatabaseUrl! },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    if (exitCode !== 0) throw new Error(stderr);
  }, 30_000);

  afterAll(async () => {
    if (client) await client.end();
  });

  test("duplicates multi-class questions, deletes approved ambiguities, and rebuilds runs/scores", async () => {
    const [counts] = await client<Array<{ questions: number; submissions: number; results: number; runs: number; scores: number }>>`
      select
        (select count(*)::int from questions) questions,
        (select count(*)::int from submissions) submissions,
        (select count(*)::int from testcase_results) results,
        (select count(*)::int from submission_runs) runs,
        (select count(*)::int from question_scores) scores
    `;
    expect(counts).toEqual({ questions: 3, submissions: 5, results: 5, runs: 5, scores: 3 });
  });

  test("migrates teacher to TA, preserves permanent ranking, and converts profile storage", async () => {
    const [role] = await client<Array<{ role: string }>>`select role from workspace_members where user_id = '00000000-0000-0000-0000-000000000003'`;
    expect(role?.role).toBe("ta");
    const ranked = await client<Array<{ user_id: string; is_ranked: boolean }>>`select user_id, is_ranked from submissions order by user_id`;
    expect(ranked.filter((row) => row.user_id !== "00000000-0000-0000-0000-000000000002").every((row) => !row.is_ranked)).toBe(true);
    const [column] = await client<Array<{ data_type: string }>>`
      select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'profile_picture'
    `;
    expect(column?.data_type).toBe("text");
  });

  test("removes classroom table and column names from the migrated schema", async () => {
    const [tables] = await client<Array<{ classrooms: string | null; workspaces: string | null }>>`
      select to_regclass('public.classrooms')::text as classrooms,
             to_regclass('public.workspaces')::text as workspaces
    `;
    expect(tables).toEqual({ classrooms: null, workspaces: "workspaces" });
    const [column] = await client<Array<{ column_name: string }>>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'questions' and column_name = 'workspace_id'
    `;
    expect(column?.column_name).toBe("workspace_id");
  });

  test("removes legacy assignment storage after using it to derive workspace ownership", async () => {
    const [state] = await client<Array<{
      assignments: string | null;
      question_links: string | null;
      assignment_id: boolean;
      is_late: boolean;
    }>>`
      select
        to_regclass('public.assignments')::text as assignments,
        to_regclass('public.assignment_questions')::text as question_links,
        exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'submissions' and column_name = 'assignment_id'
        ) as assignment_id,
        exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'submissions' and column_name = 'is_late'
        ) as is_late
    `;

    expect(state).toEqual({ assignments: null, question_links: null, assignment_id: false, is_late: false });
  });

  test("applies post-remediation sandbox job migrations instead of adopting past them", async () => {
    const [table] = await client<Array<{ sandbox_jobs: string | null }>>`
      select to_regclass('public.sandbox_jobs')::text as sandbox_jobs
    `;
    expect(table?.sandbox_jobs).toBe("sandbox_jobs");
  });

  test("serves the first scoreboard page from the migrated schema", async () => {
    const child = Bun.spawn([
      "bun",
      "--conditions",
      "react-server",
      "tests/integration/helpers/scoreboard-smoke.ts",
      "00000000-0000-0000-0000-000000000101",
      "00000000-0000-0000-0000-000000000002",
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl!,
        SESSION_SECRET: process.env.SESSION_SECRET ?? "integration-session-secret-at-least-32-characters",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(exitCode, stderr).toBe(0);
    const page = JSON.parse(stdout) as { items: Array<{ username: string; totalScore: string; solvedCount: number }> };
    expect(page.items).toEqual([
      expect.objectContaining({ username: "student", totalScore: "200.00", solvedCount: 2 }),
    ]);
  });

  test("executes scoped collection search and cursor binding in PostgreSQL", async () => {
    const child = Bun.spawn([
      "bun",
      "--conditions",
      "react-server",
      "tests/integration/helpers/collection-search-smoke.ts",
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl!,
        SESSION_SECRET: process.env.SESSION_SECRET ?? "integration-session-secret-at-least-32-characters",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(exitCode, stderr).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      crossAdminWorkspaceCursorStatus: 400,
      workspacePages: [["Two"], ["One"]],
      questionPages: [["Multi"], ["Single"]],
      memberPages: [["teacher"], ["student"]],
      submissionPages: [["Multi"], ["Single"]],
      userPages: [["teacher"], ["student"]],
      workspaceDetail: { memberCount: 2, questionCount: 2, solvedCount: 2 },
      crossActorQuestionCursorStatus: 400,
      mismatchedCursorStatus: 400,
      questions: ["Single"],
      members: ["student"],
      submissions: ["Single"],
      scoreboard: ["student"],
      literalWildcardCount: 0,
    });
  });
});
