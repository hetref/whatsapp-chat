-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'SILVER', 'GOLD');

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "api_access_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bulk_send_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contacts_limit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "groups_limit" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "razorpay_plan_id" TEXT,
ADD COLUMN     "storage_limit_bytes" BIGINT NOT NULL DEFAULT 5368709120;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "api_access_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bulk_send_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contacts_limit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "groups_limit" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "storage_limit_bytes" BIGINT NOT NULL DEFAULT 5368709120,
ADD COLUMN     "storage_used_bytes" BIGINT NOT NULL DEFAULT 0;
