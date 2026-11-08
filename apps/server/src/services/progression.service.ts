import type { StockId, VersionRequest } from "@bullish/shared";
import { dailyNews } from "../data/news.ts";
import { calculateInterest } from "../engines/bank.engine.ts";
import { simulateCrowd } from "../engines/crowd.engine.ts";
import { simulateMarket } from "../engines/market.engine.ts";
import { clamp } from "../engines/random.ts";
import { buildDailyReport } from "../engines/report.engine.ts";
import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";
import { prisma } from "../lib/prisma.ts";
import { findGame } from "../repositories/game.repository.ts";
import { advanceDay, persistDayClose, resetGame } from "../repositories/gameplay.repository.ts";
import { mutateGame } from "./game-mutation.service.ts";
import { toGameState } from "./game-state.mapper.ts";
import { getGame } from "./game.service.ts";

export async function endDay(gameId: string, input: VersionRequest, key: string) {
  // Read a consistent snapshot, then run the pure engines outside the write transaction.
  const snapshot = await prisma.$transaction((tx) => findGame(tx, gameId), { isolationLevel: "RepeatableRead" });
  let simulation: ReturnType<typeof buildDailyReport> | undefined;
  if (snapshot && snapshot.phase === "TRADING" && snapshot.version === input.expectedVersion) {
    const state = toGameState(snapshot);
    if (state.prediction) {
      const news = dailyNews.find((item) => item.day === snapshot.day)!;
      const results = snapshot.holdings.map(({ stock }) => {
        const currentPricePence = state.stocks.find((item) => item.id === stock.id)!.pricePence;
        const previous = snapshot.prices.find((item) => item.stockID === stock.id && item.day === Math.max(0, snapshot.lastSimulatedDay - 1))!;
        const momentum = snapshot.day === 1 ? 0 : clamp((currentPricePence / previous.pricePence - 1) / .1, -1, 1);
        const crowd = simulateCrowd({ seed: snapshot.seed, day: snapshot.day, stockId: stock.id as StockId,
          newsSignal: stock.id === news.focusStockId ? news.impact : 0, momentum });
        return simulateMarket({ seed: snapshot.seed, day: snapshot.day, currentPricePence, volatility: stock.volatility, crowd });
      }).sort((a, b) => a.stockId.localeCompare(b.stockId));
      const interest = calculateInterest(state.wallet.savingsPence, state.wallet.annualInterestBps);
      const arbitrage = snapshot.arbitrageAttempts.find((item) => item.day === snapshot.day)?.profitPence ?? 0;
      simulation = buildDailyReport(state, results, interest, arbitrage);
    }
  }
  return mutateGame({ gameId, key, operation: "end-day", input, phases: ["TRADING"],
    apply: async (tx, game) => {
      if (!game.predictions.some((item) => item.day === game.day)) {
        throw new AppError(422, "PREDICTION_REQUIRED", "Save today's prediction before ending the day.");
      }
      if (game.lastSimulatedDay >= game.day) {
        throw new AppError(409, "DAY_ALREADY_SIMULATED", "This day has already been simulated.");
      }
      if (!simulation || snapshot?.version !== game.version || !game.wallet) {
        throw new AppError(409, "VERSION_CONFLICT", "Your game has changed. Reload and try again.");
      }
      await persistDayClose(tx, game, simulation, checkedPence(game.wallet.savingsPence + simulation.interestPence));
    },
  });
}

export function nextDay(gameId: string, input: VersionRequest, key: string) {
  return mutateGame({ gameId, key, operation: "next-day", input, phases: ["REPORT"],
    apply: async (tx, game) => {
      if (game.day >= 3 || game.lastSimulatedDay !== game.day) {
        throw new AppError(409, "INVALID_PHASE", "There is no next day available.");
      }
      await advanceDay(tx, game);
    },
  });
}

export function reset(gameId: string, input: VersionRequest, key: string) {
  return mutateGame({ gameId, key, operation: "reset", input,
    phases: ["BRIEFING", "TRADING", "REPORT", "FINISHED"], apply: resetGame });
}

export async function getReport(gameId: string, day: number) {
  const game = await getGame(gameId);
  const report = game?.reports.find((item) => item.day === day);
  if (!report || !game) throw new AppError(404, "NOT_FOUND", "This report is not available yet.");
  return { report, version: game.version };
}
