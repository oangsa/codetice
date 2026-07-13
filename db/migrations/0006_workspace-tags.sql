CREATE TABLE "question_tags" (
	"question_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "question_tags_pkey" PRIMARY KEY("question_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_scope_check" CHECK (("tags"."workspace_id" is null and "tags"."is_preset") or ("tags"."workspace_id" is not null and not "tags"."is_preset"))
);
--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_tags_tag_question_idx" ON "question_tags" USING btree ("tag_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_global_slug_unique" ON "tags" USING btree ("slug") WHERE "tags"."workspace_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_workspace_slug_unique" ON "tags" USING btree ("workspace_id","slug") WHERE "tags"."workspace_id" is not null;--> statement-breakpoint
INSERT INTO "tags" ("name", "slug", "workspace_id", "is_preset") VALUES
  ('Arrays', 'arrays', NULL, true),
  ('Strings', 'strings', NULL, true),
  ('Loops', 'loops', NULL, true),
  ('Conditionals', 'conditionals', NULL, true),
  ('Functions', 'functions', NULL, true),
  ('Recursion', 'recursion', NULL, true),
  ('Sorting', 'sorting', NULL, true),
  ('Searching', 'searching', NULL, true),
  ('Math', 'math', NULL, true),
  ('Stack/Queue', 'stack-queue', NULL, true),
  ('Tree', 'tree', NULL, true),
  ('Graph', 'graph', NULL, true),
  ('Dynamic Programming', 'dynamic-programming', NULL, true)
ON CONFLICT ("slug") WHERE "workspace_id" IS NULL DO NOTHING;
