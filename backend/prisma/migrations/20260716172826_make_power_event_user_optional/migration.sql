-- DropForeignKey
ALTER TABLE "Power_Event" DROP CONSTRAINT "Power_Event_user_id_fkey";

-- AlterTable
ALTER TABLE "Power_Event" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Power_Event" ADD CONSTRAINT "Power_Event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
