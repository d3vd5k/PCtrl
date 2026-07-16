/*
  Warnings:

  - You are about to drop the `Power_Event` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Power_Event" DROP CONSTRAINT "Power_Event_plug_id_fkey";

-- DropForeignKey
ALTER TABLE "Power_Event" DROP CONSTRAINT "Power_Event_user_id_fkey";

-- DropTable
DROP TABLE "Power_Event";

-- CreateTable
CREATE TABLE "Power_event" (
    "event_id" TEXT NOT NULL,
    "event_type" "Power_action" NOT NULL,
    "user_id" TEXT,
    "plug_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "Power_event_pkey" PRIMARY KEY ("event_id")
);

-- AddForeignKey
ALTER TABLE "Power_event" ADD CONSTRAINT "Power_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Power_event" ADD CONSTRAINT "Power_event_plug_id_fkey" FOREIGN KEY ("plug_id") REFERENCES "Plug"("plug_id") ON DELETE RESTRICT ON UPDATE CASCADE;
