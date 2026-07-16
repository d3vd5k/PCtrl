/*
  Warnings:

  - You are about to drop the column `token` on the `Auth_session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_hash]` on the table `Auth_session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token_hash` to the `Auth_session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Auth_session_token_key";

-- AlterTable
ALTER TABLE "Auth_session" DROP COLUMN "token",
ADD COLUMN     "token_hash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Auth_session_token_hash_key" ON "Auth_session"("token_hash");
