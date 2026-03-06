-- AlterTable
-- NOTE: This column was already introduced in an earlier migration in this repo.
-- Using IF NOT EXISTS makes this migration idempotent for fresh resets.
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "refresh_token" TEXT;
