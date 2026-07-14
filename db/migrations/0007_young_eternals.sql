ALTER TABLE "workspaces" ADD COLUMN "owner_id" uuid;
--> statement-breakpoint
UPDATE "workspaces"
SET "owner_id" = "created_by"
WHERE "owner_id" IS NULL AND "created_by" IS NOT NULL;
--> statement-breakpoint
DO $$
DECLARE
  fallback_owner_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM "workspaces" WHERE "owner_id" IS NULL) THEN
    SELECT "id"
    INTO fallback_owner_id
    FROM "users"
    WHERE "role" = 'admin'
    ORDER BY "created_at", "id"
    LIMIT 1;

    IF fallback_owner_id IS NULL THEN
      RAISE EXCEPTION 'Cannot migrate workspace ownership: no global administrator is available for legacy unowned workspaces.';
    END IF;

    UPDATE "workspaces"
    SET "owner_id" = fallback_owner_id
    WHERE "owner_id" IS NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "owner_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "created_by";
