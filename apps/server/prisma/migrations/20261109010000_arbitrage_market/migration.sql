BEGIN;
ALTER TABLE "ArbitrageAttempt" ADD COLUMN "orders" JSONB;
ALTER TABLE "ArbitrageAttempt" DROP CONSTRAINT "ArbitrageAttempt_pkey";
ALTER TABLE "ArbitrageAttempt" ADD PRIMARY KEY ("gameId", "day", "puzzleId");
ALTER TABLE "ArbitrageAttempt" DROP CONSTRAINT "ArbitrageAttempt_route_check";
ALTER TABLE "ArbitrageAttempt" ADD CONSTRAINT "ArbitrageAttempt_route_check"
  CHECK ("route" IN ('BUY_BUNDLE_SELL_UNITS', 'BUY_UNITS_SELL_BUNDLE', 'MARKET_BASKET'));
ALTER TABLE "ArbitrageAttempt" ADD CONSTRAINT "ArbitrageAttempt_orders_check"
  CHECK (("route" = 'MARKET_BASKET' AND "orders" IS NOT NULL
    AND jsonb_typeof("orders") = 'array' AND jsonb_array_length("orders") BETWEEN 1 AND 4)
    OR "route" IN ('BUY_BUNDLE_SELL_UNITS', 'BUY_UNITS_SELL_BUNDLE'));
UPDATE "GameSession" SET "version" = "version" + 1 WHERE "version" < 2147483647;
COMMIT;
