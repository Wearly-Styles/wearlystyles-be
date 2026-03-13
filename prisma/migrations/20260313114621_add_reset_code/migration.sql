-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "reset_code" TEXT,
ALTER COLUMN "created_at" DROP NOT NULL;
