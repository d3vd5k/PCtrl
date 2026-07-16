-- CreateEnum
CREATE TYPE "Access" AS ENUM ('GRANTED', 'SUSPENDED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "access" "Access" NOT NULL DEFAULT 'GRANTED';
