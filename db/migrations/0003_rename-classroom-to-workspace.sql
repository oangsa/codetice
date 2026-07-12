ALTER TABLE "classroom_members" RENAME TO "workspace_members";--> statement-breakpoint
ALTER TABLE "classrooms" RENAME TO "workspaces";--> statement-breakpoint
ALTER TABLE "assignment_questions" RENAME COLUMN "classroom_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "classroom_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "workspace_members" RENAME COLUMN "classroom_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "questions" RENAME COLUMN "classroom_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "rejudge_jobs" RENAME COLUMN "classroom_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "classrooms_invite_code_unique";--> statement-breakpoint
ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "classroom_members_role_check";--> statement-breakpoint
ALTER TABLE "assignment_questions" DROP CONSTRAINT IF EXISTS "assignment_questions_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "assignment_questions" DROP CONSTRAINT IF EXISTS "assignment_questions_assignment_classroom_fk";
--> statement-breakpoint
ALTER TABLE "assignment_questions" DROP CONSTRAINT IF EXISTS "assignment_questions_question_classroom_fk";
--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "assignments_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "classroom_members_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "classroom_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "classrooms_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "rejudge_jobs" DROP CONSTRAINT IF EXISTS "rejudge_jobs_classroom_id_classrooms_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "assignment_questions_classroom_sort_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "assignments_classroom_id_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "assignments_classroom_created_at_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "classroom_members_classroom_user_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "classroom_members_classroom_joined_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "questions_classroom_slug_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "questions_classroom_id_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "questions_classroom_created_at_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "questions_classroom_published_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "rejudge_jobs_classroom_created_at_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_workspace_id_id_unique" ON "assignments" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "questions_workspace_id_id_unique" ON "questions" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_workspace_fk" FOREIGN KEY ("workspace_id","assignment_id") REFERENCES "public"."assignments"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_question_workspace_fk" FOREIGN KEY ("workspace_id","question_id") REFERENCES "public"."questions"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejudge_jobs" ADD CONSTRAINT "rejudge_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_questions_workspace_sort_idx" ON "assignment_questions" USING btree ("workspace_id","assignment_id","sort_order");--> statement-breakpoint
CREATE INDEX "assignments_workspace_created_at_idx" ON "assignments" USING btree ("workspace_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_joined_idx" ON "workspace_members" USING btree ("workspace_id","joined_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_workspace_slug_unique" ON "questions" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "questions_workspace_created_at_idx" ON "questions" USING btree ("workspace_id","created_at","id");--> statement-breakpoint
CREATE INDEX "questions_workspace_published_idx" ON "questions" USING btree ("workspace_id","is_published","created_at","id");--> statement-breakpoint
CREATE INDEX "rejudge_jobs_workspace_created_at_idx" ON "rejudge_jobs" USING btree ("workspace_id","created_at","id");--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_invite_code_unique" UNIQUE("invite_code");--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_role_check" CHECK ("workspace_members"."role" in ('student', 'ta'));
