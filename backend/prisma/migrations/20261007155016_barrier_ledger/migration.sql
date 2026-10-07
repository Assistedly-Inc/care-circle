-- AlterTable
ALTER TABLE "Case" ADD COLUMN "admissionAt" DATETIME;
ALTER TABLE "Case" ADD COLUMN "dischargeAt" DATETIME;

-- CreateTable
CREATE TABLE "Barrier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "dueDate" DATETIME,
    "escalatedAt" DATETIME,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Barrier_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Barrier_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BarrierNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barrierId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BarrierNote_barrierId_fkey" FOREIGN KEY ("barrierId") REFERENCES "Barrier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BarrierNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Barrier_caseId_status_idx" ON "Barrier"("caseId", "status");

-- CreateIndex
CREATE INDEX "Barrier_type_status_idx" ON "Barrier"("type", "status");

-- CreateIndex
CREATE INDEX "BarrierNote_barrierId_idx" ON "BarrierNote"("barrierId");
