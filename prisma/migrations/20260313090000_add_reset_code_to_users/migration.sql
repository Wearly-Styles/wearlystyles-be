-- AlterTable
-- Add reset_code for OTP-based password reset. IF NOT EXISTS keeps deploy idempotent.
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "reset_code" TEXT;
