/*
  Warnings:

  - Added the required column `encrypted_key` to the `api_keys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "encrypted_key" TEXT NOT NULL;
