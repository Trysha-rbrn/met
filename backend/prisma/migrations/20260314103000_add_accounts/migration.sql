CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "accountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_name_key" ON "Account"("userId", "name");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: create default account for all existing users
INSERT INTO "Account" ("id", "name", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Primary', "id", NOW(), NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Account" a WHERE a."userId" = u."id"
);

-- Backfill: attach existing transactions to user's first account
UPDATE "Transaction" t
SET "accountId" = a."id"
FROM (
  SELECT DISTINCT ON ("userId") "id", "userId"
  FROM "Account"
  ORDER BY "userId", "createdAt" ASC
) a
WHERE t."userId" = a."userId" AND t."accountId" IS NULL;
