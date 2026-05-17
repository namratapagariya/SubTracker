/*
  Warnings:

  - Added the required column `gmailMsgId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gmailMsgId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "price" TEXT,
    "trialEndDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trialDetected" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "confidence" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Subscription" ("autoRenew", "createdAt", "id", "price", "service", "subject", "trialDetected") SELECT "autoRenew", "createdAt", "id", "price", "service", "subject", "trialDetected" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_gmailMsgId_key" ON "Subscription"("gmailMsgId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
