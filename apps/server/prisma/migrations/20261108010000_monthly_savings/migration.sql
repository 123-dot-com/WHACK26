BEGIN;
ALTER TABLE "Wallet" RENAME COLUMN "annualInterestBps" TO "monthlyInterestBps";
ALTER TABLE "Wallet" RENAME CONSTRAINT "Wallet_annualInterestBps_check" TO "Wallet_monthlyInterestBps_check";
ALTER TABLE "Wallet" ALTER COLUMN "monthlyInterestBps" SET DEFAULT 200;
UPDATE "Wallet" SET "monthlyInterestBps" = 200;
ALTER TABLE "Wallet" ADD COLUMN "savingsDepositLimitPence" INTEGER NOT NULL DEFAULT 500000;
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_savingsDepositLimitPence_check" CHECK ("savingsDepositLimitPence" > 0);
-- Terms are part of game state. Make pre-migration writes stale and keep old
-- idempotency replays from replacing a freshly loaded state in the browser.
UPDATE "GameSession" SET "version" = "version" + 1 WHERE "version" < 2147483647;
-- A deposit is capped in the locked transaction; interest may exceed the deposit limit.
COMMIT;
