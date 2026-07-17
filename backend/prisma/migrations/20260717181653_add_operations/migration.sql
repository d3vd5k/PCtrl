-- CreateEnum
CREATE TYPE "Operation" AS ENUM ('NO_OPERATION', 'BOOT', 'SHUTDOWN', 'PLUG_CUT');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "access" SET DEFAULT 'SUSPENDED';

-- CreateTable
CREATE TABLE "Pc_lock" (
    "lock_id" SERIAL NOT NULL,
    "operation" "Operation" NOT NULL,
    "power_cut_at" TIMESTAMP(3)
);

-- CreateIndex
CREATE UNIQUE INDEX "Pc_lock_lock_id_key" ON "Pc_lock"("lock_id");
