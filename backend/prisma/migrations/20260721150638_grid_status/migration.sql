/*
  Warnings:

  - You are about to drop the `Auth_session` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ESP_STATUS" AS ENUM ('NORMAL', 'BROWNOUT', 'POWERCUT');

-- DropForeignKey
ALTER TABLE "Auth_session" DROP CONSTRAINT "Auth_session_user_id_fkey";

-- DropTable
DROP TABLE "Auth_session";

-- CreateTable
CREATE TABLE "Grid_status" (
    "status_id" SERIAL NOT NULL,
    "status" "ESP_STATUS" NOT NULL DEFAULT 'NORMAL',
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Grid_status_status_id_key" ON "Grid_status"("status_id");
