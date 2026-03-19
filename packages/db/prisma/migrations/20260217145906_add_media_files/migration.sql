-- CreateTable
CREATE TABLE "media_files" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "media_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_media_files_user_type" ON "media_files"("user_id", "media_type");

-- CreateIndex
CREATE INDEX "idx_media_files_user_created" ON "media_files"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
