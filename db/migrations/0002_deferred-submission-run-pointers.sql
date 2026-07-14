ALTER TABLE "submissions" DROP CONSTRAINT "submissions_latest_run_id_submission_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_latest_scored_run_id_submission_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_latest_run_id_submission_runs_id_fk" FOREIGN KEY ("latest_run_id") REFERENCES "public"."submission_runs"("id") ON DELETE no action ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_latest_scored_run_id_submission_runs_id_fk" FOREIGN KEY ("latest_scored_run_id") REFERENCES "public"."submission_runs"("id") ON DELETE no action ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;
