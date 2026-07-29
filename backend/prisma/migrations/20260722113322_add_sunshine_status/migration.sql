-- CreateTable
CREATE TABLE "Sunshine_status" (
    "status_id" SERIAL NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "pid" INTEGER,
    "started_at" TIMESTAMP(3)
);

-- CreateIndex
CREATE UNIQUE INDEX "Sunshine_status_status_id_key" ON "Sunshine_status"("status_id");
