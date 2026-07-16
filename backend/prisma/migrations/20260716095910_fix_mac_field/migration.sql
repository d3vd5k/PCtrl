/*
  Warnings:

  - You are about to drop the column `macAddress` on the `Plug` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mac_address]` on the table `Plug` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mac_address` to the `Plug` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Plug_macAddress_key";

-- AlterTable
ALTER TABLE "Plug" DROP COLUMN "macAddress",
ADD COLUMN     "mac_address" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Plug_mac_address_key" ON "Plug"("mac_address");
