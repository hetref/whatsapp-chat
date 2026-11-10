CREATE TABLE "whatsapp_flow_submissions" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" UUID,
    "whatsapp_message_id" TEXT NOT NULL,
    "context_message_id" TEXT,
    "contact_phone" TEXT NOT NULL,
    "contact_name" TEXT,
    "response_data" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_flow_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_flow_submissions_whatsapp_message_id_key"
ON "whatsapp_flow_submissions"("whatsapp_message_id");

CREATE INDEX "idx_flow_submissions_user_flow_date"
ON "whatsapp_flow_submissions"("user_id", "flow_id", "submitted_at" DESC);

CREATE INDEX "idx_flow_submissions_contact_id"
ON "whatsapp_flow_submissions"("contact_id");

ALTER TABLE "whatsapp_flow_submissions"
ADD CONSTRAINT "whatsapp_flow_submissions_flow_id_fkey"
FOREIGN KEY ("flow_id") REFERENCES "whatsapp_flows"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_flow_submissions"
ADD CONSTRAINT "whatsapp_flow_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_flow_submissions"
ADD CONSTRAINT "whatsapp_flow_submissions_contact_id_fkey"
FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
