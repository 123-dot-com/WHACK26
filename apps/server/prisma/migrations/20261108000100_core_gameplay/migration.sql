BEGIN;
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');
CREATE TYPE "BankOperation" AS ENUM ('DEPOSIT', 'WITHDRAW', 'INTEREST');

CREATE TABLE "Trade" (
  "id" TEXT PRIMARY KEY, "gameId" TEXT NOT NULL, "day" INTEGER NOT NULL,
  "stockId" TEXT NOT NULL, "side" "TradeSide" NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "pricePence" INTEGER NOT NULL CHECK ("pricePence" > 0),
  "totalPence" INTEGER NOT NULL CHECK ("totalPence" > 0),
  CHECK ("day" BETWEEN 1 AND 3),
  CHECK ("totalPence"::bigint = "quantity"::bigint * "pricePence"::bigint),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON UPDATE CASCADE
);
CREATE INDEX "Trade_gameId_day_idx" ON "Trade"("gameId", "day");

CREATE TABLE "BankTransaction" (
  "id" TEXT PRIMARY KEY, "gameId" TEXT NOT NULL, "day" INTEGER NOT NULL,
  "operation" "BankOperation" NOT NULL,
  "amountPence" INTEGER NOT NULL CHECK ("amountPence" >= 0),
  CHECK ("day" BETWEEN 1 AND 3),
  CHECK ("operation" = 'INTEREST' OR "amountPence" > 0),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BankTransaction_gameId_day_idx" ON "BankTransaction"("gameId", "day");
CREATE UNIQUE INDEX "BankTransaction_one_interest_per_day"
  ON "BankTransaction"("gameId", "day") WHERE "operation" = 'INTEREST';

CREATE TABLE "ArbitrageAttempt" (
  "gameId" TEXT NOT NULL, "day" INTEGER NOT NULL, "puzzleId" TEXT NOT NULL,
  "route" TEXT NOT NULL CHECK ("route" IN ('BUY_BUNDLE_SELL_UNITS', 'BUY_UNITS_SELL_BUNDLE')),
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "costPence" INTEGER NOT NULL CHECK ("costPence" > 0),
  "revenuePence" INTEGER NOT NULL CHECK ("revenuePence" > 0),
  "profitPence" INTEGER NOT NULL,
  CHECK ("day" BETWEEN 1 AND 3),
  CHECK ("profitPence"::bigint = "revenuePence"::bigint - "costPence"::bigint),
  PRIMARY KEY ("gameId", "day"),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "DailyReport" (
  "gameId" TEXT NOT NULL, "day" INTEGER NOT NULL CHECK ("day" BETWEEN 1 AND 3),
  "details" JSONB NOT NULL, PRIMARY KEY ("gameId", "day"),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "IdempotencyRecord" (
  "gameId" TEXT NOT NULL, "key" TEXT NOT NULL CHECK (length("key") BETWEEN 1 AND 128),
  "requestHash" TEXT NOT NULL, "responseBody" JSONB NOT NULL,
  "statusCode" INTEGER NOT NULL CHECK ("statusCode" BETWEEN 200 AND 299),
  PRIMARY KEY ("gameId", "key"),
  FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
COMMIT;
