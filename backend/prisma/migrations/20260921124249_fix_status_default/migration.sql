-- CreateTable
CREATE TABLE "case_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT NOT NULL,
    "acceptedAt" DATETIME,
    "acceptedBy" TEXT,
    "revokedAt" DATETIME,
    "revokedBy" TEXT
);

-- CreateIndex
CREATE INDEX "case_invitations_caseId_status_idx" ON "case_invitations"("caseId", "status");

-- CreateIndex
CREATE INDEX "case_invitations_email_status_idx" ON "case_invitations"("email", "status");
