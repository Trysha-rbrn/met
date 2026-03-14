CREATE TABLE "DataTransferLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "rows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataTransferLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataTransferLog_userId_createdAt_idx"
ON "DataTransferLog"("userId", "createdAt");

ALTER TABLE "DataTransferLog"
ADD CONSTRAINT "DataTransferLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
