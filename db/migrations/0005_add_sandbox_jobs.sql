CREATE TABLE "sandbox_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"kind" varchar(30) NOT NULL,
	"language" varchar(50) NOT NULL,
	"source_code" text,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"result" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_by" varchar(255),
	"lease_expires_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "sandbox_jobs_kind_check" CHECK ("sandbox_jobs"."kind" in ('sample', 'compiler_diagnostics')),
	CONSTRAINT "sandbox_jobs_status_check" CHECK ("sandbox_jobs"."status" in ('queued', 'running', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "sandbox_jobs" ADD CONSTRAINT "sandbox_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sandbox_jobs" ADD CONSTRAINT "sandbox_jobs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sandbox_jobs" ADD CONSTRAINT "sandbox_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sandbox_jobs_status_lease_created_idx" ON "sandbox_jobs" USING btree ("status","lease_expires_at","created_at");
--> statement-breakpoint
CREATE INDEX "sandbox_jobs_requester_created_idx" ON "sandbox_jobs" USING btree ("requested_by","created_at");
--> statement-breakpoint
CREATE INDEX "sandbox_jobs_status_expires_idx" ON "sandbox_jobs" USING btree ("status","expires_at");
