import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to push the database schema.");
}

const sql = postgres(connectionString, {
  prepare: false,
  max: 1,
});

const statements = [
  `create extension if not exists pgcrypto;`,
  `create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    username varchar(50) not null unique,
    password_hash text not null,
    role varchar(20) not null default 'student',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  );`,
  `create table if not exists password_reset_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    token_hash text not null,
    expires_at timestamp not null,
    used_at timestamp,
    created_at timestamp not null default now()
  );`,
  `create table if not exists questions (
    id uuid primary key default gen_random_uuid(),
    title varchar(255) not null,
    slug varchar(255) not null unique,
    description text not null,
    difficulty varchar(20) not null default 'easy',
    total_score decimal(10, 2) not null default 100,
    time_limit_ms integer not null default 2000,
    memory_limit_mb integer not null default 128,
    starter_code text,
    starter_code_by_language text,
    is_published boolean not null default false,
    created_by uuid references users(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  );`,
  `create table if not exists classrooms (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    invite_code varchar(50) not null unique,
    created_by uuid references users(id),
    created_at timestamp not null default now()
  );`,
  `create table if not exists assignments (
    id uuid primary key default gen_random_uuid(),
    classroom_id uuid references classrooms(id) on delete cascade,
    title varchar(255) not null,
    description text,
    start_at timestamp,
    due_at timestamp,
    created_at timestamp not null default now()
  );`,
  `create table if not exists supported_languages (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null,
    slug varchar(50) not null unique,
    docker_image varchar(255) not null,
    file_extension varchar(20) not null,
    run_command text not null,
    default_starter_code text,
    is_enabled boolean not null default true
  );`,
  `create table if not exists testcases (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references questions(id) on delete cascade,
    name varchar(255),
    input text not null,
    expected_output text not null,
    is_sample boolean not null default false,
    is_hidden boolean not null default true,
    checker_type varchar(50) not null default 'exact',
    float_tolerance decimal(20, 10),
    sort_order integer not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  );`,
  `create table if not exists submissions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    assignment_id uuid references assignments(id) on delete set null,
    language varchar(50) not null default 'python',
    source_code text not null,
    status varchar(30) not null,
    passed_count integer not null default 0,
    total_count integer not null default 0,
    score decimal(10, 2) not null default 0,
    runtime_ms integer,
    memory_kb integer,
    error_message text,
    created_at timestamp not null default now()
  );`,
  `create table if not exists testcase_results (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references submissions(id) on delete cascade,
    testcase_id uuid not null references testcases(id) on delete cascade,
    status varchar(30) not null,
    actual_output text,
    expected_output text,
    error_message text,
    runtime_ms integer,
    memory_kb integer,
    passed boolean not null default false,
    created_at timestamp not null default now()
  );`,
  `create table if not exists question_scores (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    best_submission_id uuid references submissions(id),
    best_score decimal(10, 2) not null default 0,
    attempts integer not null default 0,
    updated_at timestamp not null default now()
  );`,
  `create table if not exists grading_jobs (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references submissions(id) on delete cascade,
    status varchar(30) not null default 'queued',
    attempts integer not null default 0,
    error_message text,
    created_at timestamp not null default now(),
    started_at timestamp,
    completed_at timestamp
  );`,
  `create table if not exists rejudge_jobs (
    id uuid primary key default gen_random_uuid(),
    question_id uuid references questions(id) on delete cascade,
    requested_by uuid references users(id),
    status varchar(30) not null default 'queued',
    created_at timestamp not null default now(),
    completed_at timestamp
  );`,
  `create table if not exists custom_checkers (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references questions(id) on delete cascade,
    language varchar(50) not null default 'python',
    source_code text not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  );`,
  `create table if not exists rate_limits (
    id uuid primary key default gen_random_uuid(),
    identifier varchar(255) not null,
    action varchar(100) not null,
    count integer not null default 1,
    window_start timestamp not null default now()
  );`,
  `create table if not exists leaderboards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    total_score decimal(10, 2) not null default 0,
    solved_count integer not null default 0,
    updated_at timestamp not null default now()
  );`,
  `create table if not exists classroom_members (
    id uuid primary key default gen_random_uuid(),
    classroom_id uuid not null references classrooms(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    role varchar(20) not null default 'student',
    joined_at timestamp not null default now()
  );`,
  `create table if not exists assignment_questions (
    id uuid primary key default gen_random_uuid(),
    assignment_id uuid not null references assignments(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    sort_order integer not null default 0
  );`,
  `alter table questions add column if not exists starter_code_by_language text;`,
  `alter table questions add column if not exists allowed_languages text;`,
  `alter table testcases add column if not exists checker_type varchar(50) not null default 'exact';`,
  `alter table testcases add column if not exists float_tolerance decimal(20, 10);`,
  `alter table submissions add column if not exists assignment_id uuid references assignments(id) on delete set null;`,
  `create unique index if not exists question_scores_user_question_unique on question_scores (user_id, question_id);`,
  `create index if not exists questions_published_created_at_idx on questions (is_published, created_at);`,
  `create index if not exists questions_created_at_idx on questions (created_at);`,
  `create index if not exists testcases_question_sort_idx on testcases (question_id, sort_order, created_at);`,
  `create index if not exists submissions_user_created_at_idx on submissions (user_id, created_at);`,
  `create index if not exists submissions_question_created_at_idx on submissions (question_id, created_at);`,
  `create index if not exists submissions_created_at_idx on submissions (created_at);`,
  `create index if not exists testcase_results_submission_idx on testcase_results (submission_id);`,
  `create index if not exists grading_jobs_submission_created_at_idx on grading_jobs (submission_id, created_at);`,
  `create index if not exists grading_jobs_status_created_at_idx on grading_jobs (status, created_at);`,
  `create unique index if not exists rate_limits_identifier_action_window_unique on rate_limits (identifier, action, window_start);`,
  `create unique index if not exists leaderboards_user_unique on leaderboards (user_id);`,
  `create unique index if not exists classroom_members_classroom_user_unique on classroom_members (classroom_id, user_id);`,
  `create unique index if not exists assignment_questions_assignment_question_unique on assignment_questions (assignment_id, question_id);`,
  `create unique index if not exists password_reset_tokens_token_hash_unique on password_reset_tokens (token_hash);`,
  `create index if not exists password_reset_tokens_user_created_at_idx on password_reset_tokens (user_id, created_at);`,
  `alter table submissions add column if not exists is_late boolean not null default false;`,
];

async function main() {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  console.log("Database schema is up to date.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
