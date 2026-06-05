-- CreateTable
CREATE TABLE "PolicyExpiryReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyDbId" TEXT NOT NULL,
    "reminderDays" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyExpiryReminder_policyDbId_fkey" FOREIGN KEY ("policyDbId") REFERENCES "Policy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PolicyExpiryReminder_policyDbId_reminderDays_channel_key" ON "PolicyExpiryReminder"("policyDbId", "reminderDays", "channel");
CREATE INDEX "PolicyExpiryReminder_sentAt_idx" ON "PolicyExpiryReminder"("sentAt");
CREATE INDEX "PolicyExpiryReminder_policyDbId_idx" ON "PolicyExpiryReminder"("policyDbId");
