BEGIN;

-- CreateEnum
CREATE TYPE "PredictionDirection" AS ENUM ('BULLISH', 'NEUTRAL', 'BEARISH');

-- CreateTable
CREATE TABLE "Prediction" (
    "gameId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "stockId" TEXT NOT NULL,
    "direction" "PredictionDirection" NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("gameId","day")
);

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep these checks in a new migration: the earlier migration is already applied.
ALTER TABLE "Holding"
ADD CONSTRAINT "Holding_quantity_check"
CHECK ("quantity" >= 0);

ALTER TABLE "StockPrice"
ADD CONSTRAINT "StockPrice_pricePence_check"
CHECK ("pricePence" >= 1);

ALTER TABLE "StockPrice"
ADD CONSTRAINT "StockPrice_day_check"
CHECK ("day" BETWEEN 0 AND 3);

ALTER TABLE "Prediction"
ADD CONSTRAINT "Prediction_day_check"
CHECK ("day" BETWEEN 1 AND 3);

COMMIT;
