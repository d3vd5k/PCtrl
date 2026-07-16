/*
  Warnings:

  - A unique constraint covering the columns `[macAddress]` on the table `Plug` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `macAddress` to the `Plug` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plug" ADD COLUMN     "macAddress" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Plug_macAddress_key" ON "Plug"("macAddress");
