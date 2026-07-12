ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_assignment_id_assignments_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "assignment_id";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "is_late";--> statement-breakpoint
DROP TABLE "assignment_questions";--> statement-breakpoint
DROP TABLE "assignments";
