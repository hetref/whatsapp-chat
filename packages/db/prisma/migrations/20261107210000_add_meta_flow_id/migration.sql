ALTER TABLE "whatsapp_flows" ADD COLUMN "meta_flow_id" TEXT;

CREATE UNIQUE INDEX "whatsapp_flows_meta_flow_id_key" ON "whatsapp_flows"("meta_flow_id");
