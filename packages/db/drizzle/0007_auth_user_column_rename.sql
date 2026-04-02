DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partners'
      AND column_name = 'clerk_user_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partners'
      AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE "partners" RENAME COLUMN "clerk_user_id" TO "auth_user_id";
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND column_name = 'clerk_user_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE "team_members" RENAME COLUMN "clerk_user_id" TO "auth_user_id";
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'partners_clerk_user_id_unique'
      AND conrelid = 'public.partners'::regclass
  ) THEN
    ALTER TABLE "partners"
      RENAME CONSTRAINT "partners_clerk_user_id_unique" TO "partners_auth_user_id_unique";
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'team_members_clerk_user_id_idx'
  ) THEN
    ALTER INDEX "team_members_clerk_user_id_idx" RENAME TO "team_members_auth_user_id_idx";
  END IF;
END $$;
