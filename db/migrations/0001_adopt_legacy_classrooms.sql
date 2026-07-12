-- This migration is both the legacy-schema adoption step and the no-op follow-up
-- for databases created from 0000. scripts/migrate.ts records 0000 as the
-- baseline when it detects the pre-migration production schema.

CREATE TABLE IF NOT EXISTS "submission_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "submission_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "trigger" varchar(20) NOT NULL,
  "status" varchar(30) DEFAULT 'queued' NOT NULL,
  "passed_count" integer DEFAULT 0 NOT NULL,
  "total_count" integer DEFAULT 0 NOT NULL,
  "score" numeric(10, 2) DEFAULT 0 NOT NULL,
  "runtime_ms" integer,
  "memory_kb" integer,
  "error_message" text,
  "requested_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp,
  "completed_at" timestamp
);
--> statement-breakpoint

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "classroom_id" uuid;
ALTER TABLE "assignment_questions" ADD COLUMN IF NOT EXISTS "classroom_id" uuid;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "is_ranked" boolean DEFAULT true NOT NULL;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "latest_run_id" uuid;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "latest_scored_run_id" uuid;
ALTER TABLE "testcase_results" ADD COLUMN IF NOT EXISTS "submission_run_id" uuid;
ALTER TABLE "testcase_results" ADD COLUMN IF NOT EXISTS "testcase_name" varchar(255);
ALTER TABLE "testcase_results" ADD COLUMN IF NOT EXISTS "testcase_sort_order" integer DEFAULT 0 NOT NULL;
ALTER TABLE "testcase_results" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT true NOT NULL;
ALTER TABLE "grading_jobs" ADD COLUMN IF NOT EXISTS "submission_run_id" uuid;
ALTER TABLE "grading_jobs" ADD COLUMN IF NOT EXISTS "rejudge_job_id" uuid;
ALTER TABLE "rejudge_jobs" ADD COLUMN IF NOT EXISTS "classroom_id" uuid;
ALTER TABLE "rejudge_jobs" ADD COLUMN IF NOT EXISTS "submission_id" uuid;
ALTER TABLE "rejudge_jobs" ADD COLUMN IF NOT EXISTS "total_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "rejudge_jobs" ADD COLUMN IF NOT EXISTS "completed_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "rejudge_jobs" ADD COLUMN IF NOT EXISTS "failed_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "rejudge_jobs" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
ALTER TABLE "supported_languages" ADD COLUMN IF NOT EXISTS "runtime_status" varchar(20) DEFAULT 'pending' NOT NULL;
ALTER TABLE "supported_languages" ADD COLUMN IF NOT EXISTS "runtime_checked_at" timestamp;
ALTER TABLE "supported_languages" ADD COLUMN IF NOT EXISTS "runtime_error" text;
ALTER TABLE "users" ALTER COLUMN "profile_picture" TYPE text USING "profile_picture"::text;
--> statement-breakpoint

DO $migration$
DECLARE
  before_questions bigint;
  before_submissions bigint;
  before_results bigint;
  before_scores bigint;
  after_questions bigint;
  after_submissions bigint;
  after_results bigint;
  after_scores bigint;
  clone_count bigint;
  approved_submission_deletes bigint;
  approved_result_deletes bigint;
  orphan_question_count bigint;
  legacy_schema boolean;
  constraint_row record;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'testcase_results'
      AND column_name = 'submission_id'
  ) INTO legacy_schema;

  IF NOT legacy_schema THEN
    RAISE NOTICE 'Codetice migration counts: fresh schema; legacy data remap skipped';
    RETURN;
  END IF;

  LOCK TABLE questions, testcases, custom_checkers, assignments,
    assignment_questions, submissions, testcase_results, grading_jobs,
    rejudge_jobs, question_scores, classroom_members IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO before_questions FROM questions;
  SELECT count(*) INTO before_submissions FROM submissions;
  SELECT count(*) INTO before_results FROM testcase_results;
  SELECT count(*) INTO before_scores FROM question_scores;

  IF EXISTS (SELECT 1 FROM assignments WHERE classroom_id IS NULL) THEN
    RAISE EXCEPTION 'Migration aborted: assignments with no classroom are not an approved deletion case';
  END IF;

  UPDATE classroom_members SET role = 'ta' WHERE role = 'teacher';

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'questions'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ~* '^UNIQUE \(slug\)$'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
  DROP INDEX IF EXISTS questions_slug_unique;
  DROP INDEX IF EXISTS questions_slug_idx;

  CREATE TEMP TABLE _question_classes ON COMMIT DROP AS
  SELECT DISTINCT aq.question_id AS old_question_id, a.classroom_id
  FROM assignment_questions aq
  JOIN assignments a ON a.id = aq.assignment_id;

  CREATE TEMP TABLE _question_map (
    old_question_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    new_question_id uuid NOT NULL,
    is_primary boolean NOT NULL,
    PRIMARY KEY (old_question_id, classroom_id),
    UNIQUE (new_question_id)
  ) ON COMMIT DROP;

  INSERT INTO _question_map (old_question_id, classroom_id, new_question_id, is_primary)
  SELECT
    old_question_id,
    classroom_id,
    CASE WHEN ordinal = 1 THEN old_question_id ELSE (
      substr(digest, 1, 8) || '-' || substr(digest, 9, 4) || '-' ||
      substr(digest, 13, 4) || '-' || substr(digest, 17, 4) || '-' ||
      substr(digest, 21, 12)
    )::uuid END,
    ordinal = 1
  FROM (
    SELECT
      old_question_id,
      classroom_id,
      row_number() OVER (PARTITION BY old_question_id ORDER BY classroom_id::text) AS ordinal,
      md5(old_question_id::text || ':' || classroom_id::text) AS digest
    FROM _question_classes
  ) ranked;

  IF EXISTS (
    SELECT 1 FROM _question_map m
    JOIN questions q ON q.id = m.new_question_id
    WHERE m.new_question_id <> m.old_question_id
  ) THEN
    RAISE EXCEPTION 'Migration aborted: deterministic question clone UUID collision';
  END IF;

  CREATE TEMP TABLE _assignment_question_map ON COMMIT DROP AS
  SELECT
    aq.id AS assignment_question_id,
    aq.assignment_id,
    aq.question_id AS old_question_id,
    a.classroom_id,
    m.new_question_id
  FROM assignment_questions aq
  JOIN assignments a ON a.id = aq.assignment_id
  JOIN _question_map m
    ON m.old_question_id = aq.question_id
   AND m.classroom_id = a.classroom_id;

  IF (SELECT count(*) FROM _assignment_question_map) <> (SELECT count(*) FROM assignment_questions) THEN
    RAISE EXCEPTION 'Migration aborted: an assignment-question row could not be mapped';
  END IF;

  CREATE TEMP TABLE _approved_submission_deletes ON COMMIT DROP AS
  SELECT s.id
  FROM submissions s
  WHERE NOT EXISTS (
      SELECT 1 FROM _question_map m WHERE m.old_question_id = s.question_id
    )
    OR (
      s.assignment_id IS NULL
      AND (SELECT count(*) FROM _question_map m WHERE m.old_question_id = s.question_id) > 1
    );

  CREATE TEMP TABLE _approved_result_deletes ON COMMIT DROP AS
  SELECT tr.id
  FROM testcase_results tr
  JOIN _approved_submission_deletes d ON d.id = tr.submission_id;

  SELECT count(*) INTO approved_submission_deletes FROM _approved_submission_deletes;
  SELECT count(*) INTO approved_result_deletes FROM _approved_result_deletes;
  SELECT count(*) INTO orphan_question_count
  FROM questions q
  WHERE NOT EXISTS (SELECT 1 FROM _question_map m WHERE m.old_question_id = q.id);
  SELECT count(*) - count(DISTINCT old_question_id) INTO clone_count FROM _question_map;

  IF EXISTS (
    SELECT 1
    FROM submissions s
    WHERE s.assignment_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM _approved_submission_deletes d WHERE d.id = s.id)
      AND NOT EXISTS (
        SELECT 1
        FROM _assignment_question_map m
        WHERE m.assignment_id = s.assignment_id
          AND m.old_question_id = s.question_id
      )
  ) THEN
    RAISE EXCEPTION 'Migration aborted: assignment submission does not reference a question in that assignment';
  END IF;

  UPDATE questions q
  SET classroom_id = m.classroom_id
  FROM _question_map m
  WHERE m.old_question_id = q.id AND m.is_primary;

  INSERT INTO questions (
    id, classroom_id, title, slug, description, difficulty, total_score,
    time_limit_ms, memory_limit_mb, starter_code, starter_code_by_language,
    allowed_languages, is_published, created_by, created_at, updated_at
  )
  SELECT
    m.new_question_id, m.classroom_id, q.title, q.slug, q.description,
    q.difficulty, q.total_score, q.time_limit_ms, q.memory_limit_mb,
    q.starter_code, q.starter_code_by_language, q.allowed_languages,
    q.is_published, q.created_by, q.created_at, q.updated_at
  FROM _question_map m
  JOIN questions q ON q.id = m.old_question_id
  WHERE NOT m.is_primary;

  CREATE TEMP TABLE _testcase_map (
    old_testcase_id uuid NOT NULL,
    new_question_id uuid NOT NULL,
    new_testcase_id uuid NOT NULL,
    PRIMARY KEY (old_testcase_id, new_question_id),
    UNIQUE (new_testcase_id)
  ) ON COMMIT DROP;

  INSERT INTO _testcase_map (old_testcase_id, new_question_id, new_testcase_id)
  SELECT
    t.id,
    m.new_question_id,
    CASE WHEN m.is_primary THEN t.id ELSE (
      substr(d.digest, 1, 8) || '-' || substr(d.digest, 9, 4) || '-' ||
      substr(d.digest, 13, 4) || '-' || substr(d.digest, 17, 4) || '-' ||
      substr(d.digest, 21, 12)
    )::uuid END
  FROM testcases t
  JOIN _question_map m ON m.old_question_id = t.question_id
  CROSS JOIN LATERAL (
    SELECT md5(t.id::text || ':' || m.new_question_id::text) AS digest
  ) d;

  INSERT INTO testcases (
    id, question_id, name, input, expected_output, is_sample, is_hidden,
    checker_type, float_tolerance, sort_order, created_at, updated_at
  )
  SELECT
    tm.new_testcase_id, tm.new_question_id, t.name, t.input,
    t.expected_output, t.is_sample, t.is_hidden, t.checker_type,
    t.float_tolerance, t.sort_order, t.created_at, t.updated_at
  FROM _testcase_map tm
  JOIN testcases t ON t.id = tm.old_testcase_id
  WHERE tm.new_testcase_id <> tm.old_testcase_id;

  INSERT INTO custom_checkers (id, question_id, language, source_code, created_at, updated_at)
  SELECT
    (
      substr(d.digest, 1, 8) || '-' || substr(d.digest, 9, 4) || '-' ||
      substr(d.digest, 13, 4) || '-' || substr(d.digest, 17, 4) || '-' ||
      substr(d.digest, 21, 12)
    )::uuid,
    m.new_question_id,
    c.language,
    c.source_code,
    c.created_at,
    c.updated_at
  FROM custom_checkers c
  JOIN _question_map m ON m.old_question_id = c.question_id AND NOT m.is_primary
  CROSS JOIN LATERAL (
    SELECT md5(c.id::text || ':' || m.new_question_id::text) AS digest
  ) d;

  UPDATE assignment_questions aq
  SET classroom_id = m.classroom_id,
      question_id = m.new_question_id
  FROM _assignment_question_map m
  WHERE m.assignment_question_id = aq.id;

  DELETE FROM submissions s
  USING _approved_submission_deletes d
  WHERE s.id = d.id;

  UPDATE submissions s
  SET question_id = m.new_question_id
  FROM _assignment_question_map m
  WHERE s.assignment_id = m.assignment_id
    AND s.question_id = m.old_question_id;

  UPDATE submissions s
  SET question_id = m.new_question_id
  FROM _question_map m
  WHERE s.assignment_id IS NULL
    AND s.question_id = m.old_question_id
    AND (SELECT count(*) FROM _question_map m2 WHERE m2.old_question_id = s.question_id) = 1;

  DELETE FROM questions q
  WHERE NOT EXISTS (SELECT 1 FROM _question_map m WHERE m.old_question_id = q.id);

  IF EXISTS (
    SELECT 1
    FROM testcase_results tr
    JOIN submissions s ON s.id = tr.submission_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM _testcase_map tm
      WHERE tm.old_testcase_id = tr.testcase_id
        AND tm.new_question_id = s.question_id
    )
  ) THEN
    RAISE EXCEPTION 'Migration aborted: a testcase result could not be mapped to the cloned question';
  END IF;

  UPDATE testcase_results tr
  SET testcase_id = tm.new_testcase_id
  FROM submissions s, _testcase_map tm
  WHERE s.id = tr.submission_id
    AND tm.old_testcase_id = tr.testcase_id
    AND tm.new_question_id = s.question_id;

  UPDATE rejudge_jobs r
  SET classroom_id = q.classroom_id,
      submission_id = NULL,
      total_count = 0,
      completed_count = 0,
      failed_count = 0,
      status = 'completed',
      completed_at = COALESCE(r.completed_at, now())
  FROM questions q
  WHERE q.id = r.question_id;

  IF EXISTS (SELECT 1 FROM rejudge_jobs WHERE classroom_id IS NULL OR question_id IS NULL) THEN
    RAISE EXCEPTION 'Migration aborted: a legacy rejudge job has no classroom-owned question';
  END IF;

  UPDATE submissions s
  SET is_ranked = NOT (
    EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id AND u.role = 'admin')
    OR EXISTS (
      SELECT 1
      FROM questions q
      JOIN classroom_members cm
        ON cm.classroom_id = q.classroom_id
       AND cm.user_id = s.user_id
       AND cm.role = 'ta'
      WHERE q.id = s.question_id
    )
  );

  INSERT INTO submission_runs (
    id, submission_id, sequence, trigger, status, passed_count, total_count,
    score, runtime_ms, memory_kb, error_message, requested_by, created_at,
    started_at, completed_at
  )
  SELECT
    (
      substr(d.digest, 1, 8) || '-' || substr(d.digest, 9, 4) || '-' ||
      substr(d.digest, 13, 4) || '-' || substr(d.digest, 17, 4) || '-' ||
      substr(d.digest, 21, 12)
    )::uuid,
    s.id,
    1,
    'official',
    s.status,
    s.passed_count,
    s.total_count,
    s.score,
    s.runtime_ms,
    s.memory_kb,
    s.error_message,
    s.user_id,
    s.created_at,
    CASE WHEN s.status <> 'queued' THEN s.created_at ELSE NULL END,
    CASE WHEN s.status NOT IN ('queued', 'running') THEN s.created_at ELSE NULL END
  FROM submissions s
  CROSS JOIN LATERAL (SELECT md5('run:' || s.id::text) AS digest) d
  ON CONFLICT (id) DO NOTHING;

  UPDATE submissions s
  SET latest_run_id = sr.id,
      latest_scored_run_id = CASE
        WHEN sr.status NOT IN ('queued', 'running', 'internal_error') THEN sr.id
        ELSE NULL
      END
  FROM submission_runs sr
  WHERE sr.submission_id = s.id AND sr.sequence = 1;

  UPDATE testcase_results tr
  SET submission_run_id = sr.id,
      testcase_name = t.name,
      testcase_sort_order = t.sort_order,
      is_hidden = t.is_hidden
  FROM submission_runs sr, testcases t
  WHERE sr.submission_id = tr.submission_id
    AND sr.sequence = 1
    AND t.id = tr.testcase_id;

  UPDATE grading_jobs gj
  SET submission_run_id = sr.id
  FROM submission_runs sr
  WHERE sr.submission_id = gj.submission_id AND sr.sequence = 1;

  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE latest_run_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM testcase_results
    WHERE submission_run_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM grading_jobs
    WHERE submission_run_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration aborted: a surviving run reference was not backfilled';
  END IF;

  DELETE FROM question_scores;

  INSERT INTO question_scores (
    id, user_id, question_id, best_submission_id, best_score, attempts, updated_at
  )
  SELECT
    gen_random_uuid(),
    s.user_id,
    s.question_id,
    (array_agg(s.id ORDER BY sr.score DESC, s.created_at ASC, s.id ASC)
      FILTER (WHERE sr.id IS NOT NULL))[1],
    coalesce(max(sr.score), 0),
    count(*)::integer,
    now()
  FROM submissions s
  LEFT JOIN submission_runs sr ON sr.id = s.latest_scored_run_id
  WHERE s.is_ranked
  GROUP BY s.user_id, s.question_id;

  DROP TABLE IF EXISTS leaderboards;

  SELECT count(*) INTO after_questions FROM questions;
  SELECT count(*) INTO after_submissions FROM submissions;
  SELECT count(*) INTO after_results FROM testcase_results;
  SELECT count(*) INTO after_scores FROM question_scores;

  IF after_questions <> before_questions - orphan_question_count + clone_count THEN
    RAISE EXCEPTION 'Migration aborted: question count mismatch (% -> %, orphan %, clones %)',
      before_questions, after_questions, orphan_question_count, clone_count;
  END IF;
  IF after_submissions <> before_submissions - approved_submission_deletes THEN
    RAISE EXCEPTION 'Migration aborted: submission count mismatch (% -> %, approved deletes %)',
      before_submissions, after_submissions, approved_submission_deletes;
  END IF;
  IF after_results <> before_results - approved_result_deletes THEN
    RAISE EXCEPTION 'Migration aborted: result count mismatch (% -> %, approved deletes %)',
      before_results, after_results, approved_result_deletes;
  END IF;

  RAISE NOTICE 'Codetice migration counts: questions % -> % (orphans %, clones %)',
    before_questions, after_questions, orphan_question_count, clone_count;
  RAISE NOTICE 'Codetice migration counts: submissions % -> % (approved deletes %)',
    before_submissions, after_submissions, approved_submission_deletes;
  RAISE NOTICE 'Codetice migration counts: testcase_results % -> % (approved deletes %)',
    before_results, after_results, approved_result_deletes;
  RAISE NOTICE 'Codetice migration counts: question_scores % -> % (rebuilt)',
    before_scores, after_scores;
END
$migration$;
--> statement-breakpoint

ALTER TABLE "testcase_results" DROP CONSTRAINT IF EXISTS "testcase_results_submission_id_submissions_id_fk";
ALTER TABLE "testcase_results" DROP CONSTRAINT IF EXISTS "testcase_results_submission_id_fkey";
ALTER TABLE "testcase_results" DROP CONSTRAINT IF EXISTS "testcase_results_testcase_id_testcases_id_fk";
ALTER TABLE "testcase_results" DROP CONSTRAINT IF EXISTS "testcase_results_testcase_id_fkey";
ALTER TABLE "testcase_results" DROP COLUMN IF EXISTS "submission_id";
ALTER TABLE "testcase_results" ALTER COLUMN "testcase_id" DROP NOT NULL;

ALTER TABLE "questions" ALTER COLUMN "classroom_id" SET NOT NULL;
ALTER TABLE "assignments" ALTER COLUMN "classroom_id" SET NOT NULL;
ALTER TABLE "assignment_questions" ALTER COLUMN "classroom_id" SET NOT NULL;
ALTER TABLE "submissions" ALTER COLUMN "latest_run_id" SET NOT NULL;
ALTER TABLE "testcase_results" ALTER COLUMN "submission_run_id" SET NOT NULL;
ALTER TABLE "grading_jobs" ALTER COLUMN "submission_run_id" SET NOT NULL;
ALTER TABLE "rejudge_jobs" ALTER COLUMN "classroom_id" SET NOT NULL;

ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_latest_run_id_submission_runs_id_fk";
ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_latest_scored_run_id_submission_runs_id_fk";
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_latest_run_id_submission_runs_id_fk"
  FOREIGN KEY ("latest_run_id") REFERENCES "submission_runs"("id")
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_latest_scored_run_id_submission_runs_id_fk"
  FOREIGN KEY ("latest_scored_run_id") REFERENCES "submission_runs"("id")
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "questions_classroom_slug_unique" ON "questions" ("classroom_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "questions_classroom_id_id_unique" ON "questions" ("classroom_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_classroom_id_id_unique" ON "assignments" ("classroom_id", "id");
--> statement-breakpoint

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classroom_members_role_check') THEN
    ALTER TABLE classroom_members ADD CONSTRAINT classroom_members_role_check CHECK (role IN ('student', 'ta'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_classroom_id_classrooms_id_fk') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_classroom_id_classrooms_id_fk
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignment_questions_classroom_id_classrooms_id_fk') THEN
    ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_classroom_id_classrooms_id_fk
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignment_questions_assignment_classroom_fk') THEN
    ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_assignment_classroom_fk
      FOREIGN KEY (classroom_id, assignment_id) REFERENCES assignments(classroom_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignment_questions_question_classroom_fk') THEN
    ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_question_classroom_fk
      FOREIGN KEY (classroom_id, question_id) REFERENCES questions(classroom_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_runs_submission_id_submissions_id_fk') THEN
    ALTER TABLE submission_runs ADD CONSTRAINT submission_runs_submission_id_submissions_id_fk
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_runs_requested_by_users_id_fk') THEN
    ALTER TABLE submission_runs ADD CONSTRAINT submission_runs_requested_by_users_id_fk
      FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_runs_trigger_check') THEN
    ALTER TABLE submission_runs ADD CONSTRAINT submission_runs_trigger_check CHECK (trigger IN ('official', 'rejudge'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'testcase_results_submission_run_id_submission_runs_id_fk') THEN
    ALTER TABLE testcase_results ADD CONSTRAINT testcase_results_submission_run_id_submission_runs_id_fk
      FOREIGN KEY (submission_run_id) REFERENCES submission_runs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'testcase_results_testcase_id_testcases_id_fk') THEN
    ALTER TABLE testcase_results ADD CONSTRAINT testcase_results_testcase_id_testcases_id_fk
      FOREIGN KEY (testcase_id) REFERENCES testcases(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_jobs_submission_run_id_submission_runs_id_fk') THEN
    ALTER TABLE grading_jobs ADD CONSTRAINT grading_jobs_submission_run_id_submission_runs_id_fk
      FOREIGN KEY (submission_run_id) REFERENCES submission_runs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_jobs_rejudge_job_id_rejudge_jobs_id_fk') THEN
    ALTER TABLE grading_jobs ADD CONSTRAINT grading_jobs_rejudge_job_id_rejudge_jobs_id_fk
      FOREIGN KEY (rejudge_job_id) REFERENCES rejudge_jobs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rejudge_jobs_classroom_id_classrooms_id_fk') THEN
    ALTER TABLE rejudge_jobs ADD CONSTRAINT rejudge_jobs_classroom_id_classrooms_id_fk
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rejudge_jobs_submission_id_submissions_id_fk') THEN
    ALTER TABLE rejudge_jobs ADD CONSTRAINT rejudge_jobs_submission_id_submissions_id_fk
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rejudge_jobs_target_check') THEN
    ALTER TABLE rejudge_jobs ADD CONSTRAINT rejudge_jobs_target_check
      CHECK (num_nonnulls(submission_id, question_id) = 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rejudge_jobs_status_check') THEN
    ALTER TABLE rejudge_jobs ADD CONSTRAINT rejudge_jobs_status_check
      CHECK (status IN ('queued', 'running', 'completed', 'failed'));
  END IF;
END
$constraints$;
--> statement-breakpoint

DROP INDEX IF EXISTS "grading_jobs_submission_run_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "questions_classroom_slug_unique" ON "questions" ("classroom_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "questions_classroom_id_id_unique" ON "questions" ("classroom_id", "id");
CREATE INDEX IF NOT EXISTS "questions_classroom_created_at_idx" ON "questions" ("classroom_id", "created_at", "id");
CREATE INDEX IF NOT EXISTS "questions_classroom_published_idx" ON "questions" ("classroom_id", "is_published", "created_at", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_classroom_id_id_unique" ON "assignments" ("classroom_id", "id");
CREATE INDEX IF NOT EXISTS "assignments_classroom_created_at_idx" ON "assignments" ("classroom_id", "created_at", "id");
CREATE INDEX IF NOT EXISTS "assignment_questions_classroom_sort_idx" ON "assignment_questions" ("classroom_id", "assignment_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "submission_runs_submission_sequence_unique" ON "submission_runs" ("submission_id", "sequence");
CREATE INDEX IF NOT EXISTS "submission_runs_submission_created_at_idx" ON "submission_runs" ("submission_id", "created_at", "id");
CREATE INDEX IF NOT EXISTS "grading_jobs_submission_run_idx" ON "grading_jobs" ("submission_run_id");
CREATE INDEX IF NOT EXISTS "grading_jobs_rejudge_idx" ON "grading_jobs" ("rejudge_job_id", "created_at");
CREATE INDEX IF NOT EXISTS "submissions_ranked_question_idx" ON "submissions" ("user_id", "question_id", "is_ranked", "created_at");
CREATE INDEX IF NOT EXISTS "testcase_results_run_sort_idx" ON "testcase_results" ("submission_run_id", "testcase_sort_order", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "testcase_results_run_testcase_unique" ON "testcase_results" ("submission_run_id", "testcase_id");
CREATE INDEX IF NOT EXISTS "rejudge_jobs_classroom_created_at_idx" ON "rejudge_jobs" ("classroom_id", "created_at", "id");
