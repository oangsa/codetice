CREATE TABLE "assignment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_at" timestamp,
	"due_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'student' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_members_role_check" CHECK ("classroom_members"."role" in ('student', 'ta'))
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"invite_code" varchar(50) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classrooms_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "custom_checkers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"language" varchar(50) DEFAULT 'python' NOT NULL,
	"source_code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grading_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"submission_run_id" uuid NOT NULL,
	"rejudge_job_id" uuid,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_by" varchar(255),
	"lease_expires_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"key" varchar(100) NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"best_submission_id" uuid,
	"best_score" numeric(10, 2) DEFAULT '0' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"difficulty" varchar(20) DEFAULT 'easy' NOT NULL,
	"total_score" numeric(10, 2) DEFAULT '100' NOT NULL,
	"time_limit_ms" integer DEFAULT 2000 NOT NULL,
	"memory_limit_mb" integer DEFAULT 128 NOT NULL,
	"starter_code" text,
	"starter_code_by_language" text,
	"allowed_languages" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rejudge_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"submission_id" uuid,
	"question_id" uuid,
	"requested_by" uuid,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "rejudge_jobs_target_check" CHECK (num_nonnulls("rejudge_jobs"."submission_id", "rejudge_jobs"."question_id") = 1),
	CONSTRAINT "rejudge_jobs_status_check" CHECK ("rejudge_jobs"."status" in ('queued', 'running', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "submission_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"trigger" varchar(20) NOT NULL,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"score" numeric(10, 2) DEFAULT '0' NOT NULL,
	"runtime_ms" integer,
	"memory_kb" integer,
	"error_message" text,
	"requested_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "submission_runs_trigger_check" CHECK ("submission_runs"."trigger" in ('official', 'rejudge'))
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"assignment_id" uuid,
	"language" varchar(50) DEFAULT 'python' NOT NULL,
	"source_code" text NOT NULL,
	"status" varchar(30) NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"score" numeric(10, 2) DEFAULT '0' NOT NULL,
	"runtime_ms" integer,
	"memory_kb" integer,
	"error_message" text,
	"is_late" boolean DEFAULT false NOT NULL,
	"is_ranked" boolean DEFAULT true NOT NULL,
	"latest_run_id" uuid NOT NULL,
	"latest_scored_run_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supported_languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"docker_image" varchar(255) NOT NULL,
	"file_extension" varchar(20) NOT NULL,
	"build_command" text,
	"run_command" text NOT NULL,
	"editor_language" varchar(50) DEFAULT 'plaintext' NOT NULL,
	"diagnostics_format" varchar(30) DEFAULT 'none' NOT NULL,
	"diagnostics_command" text,
	"default_starter_code" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"runtime_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"runtime_checked_at" timestamp,
	"runtime_error" text,
	CONSTRAINT "supported_languages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "testcase_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_run_id" uuid NOT NULL,
	"testcase_id" uuid,
	"testcase_name" varchar(255),
	"testcase_sort_order" integer DEFAULT 0 NOT NULL,
	"is_hidden" boolean DEFAULT true NOT NULL,
	"status" varchar(30) NOT NULL,
	"actual_output" text,
	"expected_output" text,
	"error_message" text,
	"runtime_ms" integer,
	"memory_kb" integer,
	"passed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testcases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"name" varchar(255),
	"input" text NOT NULL,
	"expected_output" text NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT true NOT NULL,
	"checker_type" varchar(50) DEFAULT 'exact' NOT NULL,
	"float_tolerance" numeric(20, 10),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'student' NOT NULL,
	"profile_picture" text DEFAULT '/avatars/avatar-1.png' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('student', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_classroom_fk" FOREIGN KEY ("classroom_id","assignment_id") REFERENCES "public"."assignments"("classroom_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_question_classroom_fk" FOREIGN KEY ("classroom_id","question_id") REFERENCES "public"."questions"("classroom_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_checkers" ADD CONSTRAINT "custom_checkers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_jobs" ADD CONSTRAINT "grading_jobs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_jobs" ADD CONSTRAINT "grading_jobs_submission_run_id_submission_runs_id_fk" FOREIGN KEY ("submission_run_id") REFERENCES "public"."submission_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_jobs" ADD CONSTRAINT "grading_jobs_rejudge_job_id_rejudge_jobs_id_fk" FOREIGN KEY ("rejudge_job_id") REFERENCES "public"."rejudge_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_scores" ADD CONSTRAINT "question_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_scores" ADD CONSTRAINT "question_scores_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_scores" ADD CONSTRAINT "question_scores_best_submission_id_submissions_id_fk" FOREIGN KEY ("best_submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejudge_jobs" ADD CONSTRAINT "rejudge_jobs_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejudge_jobs" ADD CONSTRAINT "rejudge_jobs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejudge_jobs" ADD CONSTRAINT "rejudge_jobs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejudge_jobs" ADD CONSTRAINT "rejudge_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_runs" ADD CONSTRAINT "submission_runs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_runs" ADD CONSTRAINT "submission_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_latest_run_id_submission_runs_id_fk" FOREIGN KEY ("latest_run_id") REFERENCES "public"."submission_runs"("id") ON DELETE restrict ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_latest_scored_run_id_submission_runs_id_fk" FOREIGN KEY ("latest_scored_run_id") REFERENCES "public"."submission_runs"("id") ON DELETE restrict ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "testcase_results" ADD CONSTRAINT "testcase_results_submission_run_id_submission_runs_id_fk" FOREIGN KEY ("submission_run_id") REFERENCES "public"."submission_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testcase_results" ADD CONSTRAINT "testcase_results_testcase_id_testcases_id_fk" FOREIGN KEY ("testcase_id") REFERENCES "public"."testcases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testcases" ADD CONSTRAINT "testcases_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_questions_assignment_question_unique" ON "assignment_questions" USING btree ("assignment_id","question_id");--> statement-breakpoint
CREATE INDEX "assignment_questions_classroom_sort_idx" ON "assignment_questions" USING btree ("classroom_id","assignment_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_classroom_id_id_unique" ON "assignments" USING btree ("classroom_id","id");--> statement-breakpoint
CREATE INDEX "assignments_classroom_created_at_idx" ON "assignments" USING btree ("classroom_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_members_classroom_user_unique" ON "classroom_members" USING btree ("classroom_id","user_id");--> statement-breakpoint
CREATE INDEX "classroom_members_classroom_joined_idx" ON "classroom_members" USING btree ("classroom_id","joined_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "grading_jobs_submission_run_unique" ON "grading_jobs" USING btree ("submission_run_id");--> statement-breakpoint
CREATE INDEX "grading_jobs_submission_created_at_idx" ON "grading_jobs" USING btree ("submission_id","created_at");--> statement-breakpoint
CREATE INDEX "grading_jobs_rejudge_idx" ON "grading_jobs" USING btree ("rejudge_job_id","created_at");--> statement-breakpoint
CREATE INDEX "grading_jobs_status_created_at_idx" ON "grading_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "grading_jobs_lease_idx" ON "grading_jobs" USING btree ("status","lease_expires_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_identifier_action_key_unique" ON "idempotency_keys" USING btree ("identifier","action","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_action_created_at_idx" ON "idempotency_keys" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_created_at_idx" ON "password_reset_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "question_scores_user_question_unique" ON "question_scores" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_classroom_slug_unique" ON "questions" USING btree ("classroom_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_classroom_id_id_unique" ON "questions" USING btree ("classroom_id","id");--> statement-breakpoint
CREATE INDEX "questions_classroom_created_at_idx" ON "questions" USING btree ("classroom_id","created_at","id");--> statement-breakpoint
CREATE INDEX "questions_classroom_published_idx" ON "questions" USING btree ("classroom_id","is_published","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_identifier_action_window_unique" ON "rate_limits" USING btree ("identifier","action","window_start");--> statement-breakpoint
CREATE INDEX "rejudge_jobs_classroom_created_at_idx" ON "rejudge_jobs" USING btree ("classroom_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_runs_submission_sequence_unique" ON "submission_runs" USING btree ("submission_id","sequence");--> statement-breakpoint
CREATE INDEX "submission_runs_submission_created_at_idx" ON "submission_runs" USING btree ("submission_id","created_at","id");--> statement-breakpoint
CREATE INDEX "submissions_user_created_at_idx" ON "submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "submissions_question_created_at_idx" ON "submissions" USING btree ("question_id","created_at");--> statement-breakpoint
CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_ranked_question_idx" ON "submissions" USING btree ("user_id","question_id","is_ranked","created_at");--> statement-breakpoint
CREATE INDEX "testcase_results_run_sort_idx" ON "testcase_results" USING btree ("submission_run_id","testcase_sort_order","id");--> statement-breakpoint
CREATE UNIQUE INDEX "testcase_results_run_testcase_unique" ON "testcase_results" USING btree ("submission_run_id","testcase_id");--> statement-breakpoint
CREATE INDEX "testcases_question_sort_idx" ON "testcases" USING btree ("question_id","sort_order","created_at");
