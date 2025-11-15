-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "custom_name" TEXT,
    "whatsapp_name" TEXT,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_sent_by_me" BOOLEAN NOT NULL DEFAULT false,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "media_data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "access_token" TEXT,
    "phone_number_id" TEXT,
    "business_account_id" TEXT,
    "verify_token" TEXT,
    "webhook_token" TEXT,
    "api_version" TEXT NOT NULL DEFAULT 'v23.0',
    "webhook_verified" BOOLEAN NOT NULL DEFAULT false,
    "access_token_added" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phone_number" TEXT,
    "full_name" TEXT,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_messages_sender" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_messages_receiver" ON "messages"("receiver_id");

-- CreateIndex
CREATE INDEX "idx_messages_timestamp" ON "messages"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_messages_is_read" ON "messages"("is_read");

-- CreateIndex
CREATE INDEX "idx_messages_conversation" ON "messages"("sender_id", "receiver_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_chat_groups_owner_id" ON "chat_groups"("owner_id");

-- CreateIndex
CREATE INDEX "idx_group_members_group_id" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "idx_group_members_user_id" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_user_settings_phone_number_id" ON "user_settings"("phone_number_id");

-- CreateIndex
CREATE INDEX "idx_user_settings_webhook_token" ON "user_settings"("webhook_token");

-- CreateIndex
CREATE INDEX "idx_user_settings_business_account_id" ON "user_settings"("business_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_webhook_token_key" ON "user_settings"("webhook_token");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
