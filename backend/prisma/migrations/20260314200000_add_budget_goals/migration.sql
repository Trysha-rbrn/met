CREATE TABLE "BudgetGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "monthStart" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BudgetGoal_userId_categoryId_monthStart_key" ON "BudgetGoal"("userId", "categoryId", "monthStart");
CREATE INDEX "BudgetGoal_userId_monthStart_idx" ON "BudgetGoal"("userId", "monthStart");

ALTER TABLE "BudgetGoal" ADD CONSTRAINT "BudgetGoal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetGoal" ADD CONSTRAINT "BudgetGoal_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
