BEGIN;
ALTER TABLE "GameSession" ADD COLUMN "loanLockedThroughDay" INTEGER NOT NULL DEFAULT 0 CHECK ("loanLockedThroughDay" >= 0);
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'REPAID');
CREATE TYPE "LoanEventType" AS ENUM ('BORROW', 'INTEREST', 'PENALTY', 'REPAY');
CREATE TABLE "Loan" (
  "id" TEXT PRIMARY KEY, "gameId" TEXT NOT NULL,
  "principalPence" INTEGER NOT NULL CHECK ("principalPence" BETWEEN 1 AND 1000000),
  "balancePence" INTEGER NOT NULL CHECK ("balancePence" >= 0),
  "borrowedDay" INTEGER NOT NULL CHECK ("borrowedDay" BETWEEN 1 AND 3),
  "dueDay" INTEGER NOT NULL, "lastAccruedDay" INTEGER NOT NULL,
  "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE', "repaidDay" INTEGER,
  CHECK ("dueDay" = "borrowedDay" + 1),
  CHECK ("lastAccruedDay" BETWEEN "borrowedDay" - 1 AND 3),
  CHECK (("status" = 'ACTIVE' AND "balancePence" > 0 AND "repaidDay" IS NULL)
    OR ("status" = 'REPAID' AND "balancePence" = 0 AND "repaidDay" IS NOT NULL AND "repaidDay" BETWEEN "borrowedDay" AND 3)),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Loan_gameId_idx" ON "Loan"("gameId");
CREATE UNIQUE INDEX "Loan_one_active_per_game" ON "Loan"("gameId") WHERE "status" = 'ACTIVE';
CREATE TABLE "LoanEvent" (
  "id" TEXT PRIMARY KEY, "gameId" TEXT NOT NULL, "loanId" TEXT NOT NULL,
  "day" INTEGER NOT NULL CHECK ("day" BETWEEN 1 AND 3),
  "type" "LoanEventType" NOT NULL, "amountPence" INTEGER NOT NULL CHECK ("amountPence" >= 0),
  CHECK ("type" IN ('INTEREST', 'PENALTY') OR "amountPence" > 0),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LoanEvent_gameId_day_idx" ON "LoanEvent"("gameId", "day");
CREATE UNIQUE INDEX "LoanEvent_one_charge_per_day" ON "LoanEvent"("loanId", "day") WHERE "type" IN ('INTEREST', 'PENALTY');
UPDATE "GameSession" SET "version" = "version" + 1 WHERE "version" < 2147483647;
COMMIT;
