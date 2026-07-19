-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CODE_SERVER', 'SUNSHINE');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('STARTING', 'RUNNING', 'STOPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "Session_status" AS ENUM ('ACTIVE', 'TERMINATED');

-- CreateTable
CREATE TABLE "Session" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "Session_status" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "Session_service" (
    "service_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "port" INTEGER NOT NULL,
    "password" TEXT NOT NULL,
    "pid" INTEGER,
    "status" "ServiceStatus" NOT NULL DEFAULT 'STARTING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMP(3),

    CONSTRAINT "Session_service_pkey" PRIMARY KEY ("service_id")
);

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session_service" ADD CONSTRAINT "Session_service_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;
