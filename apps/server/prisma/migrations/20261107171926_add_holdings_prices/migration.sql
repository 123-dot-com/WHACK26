-- CreateTable
CREATE TABLE "Holding" (
    "gameID" TEXT NOT NULL,
    "stockID" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("gameID","stockID")
);

-- CreateTable
CREATE TABLE "StockPrice" (
    "gameID" TEXT NOT NULL,
    "stockID" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "pricePence" INTEGER NOT NULL,

    CONSTRAINT "StockPrice_pkey" PRIMARY KEY ("gameID","stockID","day")
);

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_gameID_fkey" FOREIGN KEY ("gameID") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_stockID_fkey" FOREIGN KEY ("stockID") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPrice" ADD CONSTRAINT "StockPrice_gameID_fkey" FOREIGN KEY ("gameID") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPrice" ADD CONSTRAINT "StockPrice_stockID_fkey" FOREIGN KEY ("stockID") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Holding"
ADD CONSTRAINT "Holding_quantity_check"
CHECK ("quantity" >= 0);

ALTER TABLE "StockPrice"
ADD CONSTRAINT "StockPrice_pricePence_check"
CHECK ("pricePence" >= 1);

ALTER TABLE "StockPrice"
ADD CONSTRAINT "StockPrice_day_check"
CHECK ("day" BETWEEN 0 AND 3);