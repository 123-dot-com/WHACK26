CREATE TYPE "GamePhase" AS ENUM ('BRIEFING', 'TRADING', 'REPORT', 'FINISHED');
CREATE TYPE "StockSector" AS ENUM ('TECH', 'ENERGY', 'FINANCE');

CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 1,
    "phase" "GamePhase" NOT NULL DEFAULT 'BRIEFING',
    "seed" INTEGER NOT NULL DEFAULT 2026,
    "version" INTEGER NOT NULL DEFAULT 0,
    "lastSimulatedDay" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GameSession_day_check" CHECK ("day" BETWEEN 1 AND 3),
    CONSTRAINT "GameSession_version_check" CHECK ("version" >= 0),
    CONSTRAINT "GameSession_lastSimulatedDay_check" CHECK (
        "lastSimulatedDay" BETWEEN 0 AND 3 AND "lastSimulatedDay" <= "day"
    )
);

CREATE TABLE "Wallet" (
    "gameId" TEXT NOT NULL,
    "cashPence" INTEGER NOT NULL DEFAULT 1000000,
    "savingsPence" INTEGER NOT NULL DEFAULT 0,
    "annualInterestBps" INTEGER NOT NULL DEFAULT 400,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("gameId"),
    CONSTRAINT "Wallet_cashPence_check" CHECK ("cashPence" >= 0),
    CONSTRAINT "Wallet_savingsPence_check" CHECK ("savingsPence" >= 0),
    CONSTRAINT "Wallet_annualInterestBps_check" CHECK ("annualInterestBps" >= 0)
);

CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" "StockSector" NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "initialPricePence" INTEGER NOT NULL,
    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Stock_initialPricePence_check" CHECK ("initialPricePence" >= 1),
    CONSTRAINT "Stock_volatility_check" CHECK ("volatility" >= 0)
);

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "GameSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
