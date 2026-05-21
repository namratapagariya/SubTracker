/*
  Warnings:

  - Added the required column `userId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("autoRenew", "classification", "confidence", "createdAt", "gmailMsgId", "id", "price", "reminderSent", "service", "status", "subject", "trialDetected", "trialEndDate") SELECT "autoRenew", "classification", "confidence", "createdAt", "gmailMsgId", "id", "price", "reminderSent", "service", "status", "subject", "trialDetected", "trialEndDate" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_gmailMsgId_key" ON "Subscription"("gmailMsgId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
