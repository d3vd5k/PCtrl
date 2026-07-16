/*
  Warnings:

  - The primary key for the `Auth_session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Power_Event` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `plug_id` to the `Power_Event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Auth_session" DROP CONSTRAINT "Auth_session_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Power_Event" DROP CONSTRAINT "Power_Event_user_id_fkey";

-- AlterTable
ALTER TABLE "Auth_session" DROP CONSTRAINT "Auth_session_pkey",
ALTER COLUMN "auth_session_id" DROP DEFAULT,
ALTER COLUMN "auth_session_id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Auth_session_pkey" PRIMARY KEY ("auth_session_id");
DROP SEQUENCE "Auth_session_auth_session_id_seq";

-- AlterTable
ALTER TABLE "Power_Event" DROP CONSTRAINT "Power_Event_pkey",
ADD COLUMN     "plug_id" TEXT NOT NULL,
ALTER COLUMN "event_id" DROP DEFAULT,
ALTER COLUMN "event_id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Power_Event_pkey" PRIMARY KEY ("event_id");
DROP SEQUENCE "Power_Event_event_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "user_id" DROP DEFAULT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("user_id");
DROP SEQUENCE "User_user_id_seq";

-- CreateTable
CREATE TABLE "Plug" (
    "plug_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "plug_identifier" TEXT,

    CONSTRAINT "Plug_pkey" PRIMARY KEY ("plug_id")
);

-- AddForeignKey
ALTER TABLE "Power_Event" ADD CONSTRAINT "Power_Event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Power_Event" ADD CONSTRAINT "Power_Event_plug_id_fkey" FOREIGN KEY ("plug_id") REFERENCES "Plug"("plug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auth_session" ADD CONSTRAINT "Auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
