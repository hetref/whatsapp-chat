-- CreateEnum
CREATE TYPE "WhatsAppFlowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateTable
CREATE TABLE "whatsapp_flows" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_account_id" TEXT,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(512),
    "category" VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    "status" "WhatsAppFlowStatus" NOT NULL DEFAULT 'DRAFT',
    "flow_json" JSONB NOT NULL,
    "screen_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_flows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_whatsapp_flows_user_updated" ON "whatsapp_flows"("user_id", "updated_at" DESC);
CREATE INDEX "idx_whatsapp_flows_user_status" ON "whatsapp_flows"("user_id", "status");
CREATE INDEX "idx_whatsapp_flows_business_account_id" ON "whatsapp_flows"("business_account_id");

-- AddForeignKey
ALTER TABLE "whatsapp_flows" ADD CONSTRAINT "whatsapp_flows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
