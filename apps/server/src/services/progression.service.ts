import type { StockId, VersionRequest } from "@bullish/shared";
import { getDailyNews } from "../data/news.ts";
import { calculateInterest } from "../engines/bank.engine.ts";
import { accrueLoan, type LoanAccrual } from "../engines/loan.engine.ts";
import { persistLoanAccrual } from "../repositories/loan.repository.ts";
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
import { closeBotDay, planBotDay, type BotPortfolio } from "../engines/bot.engine.ts";
import { buildLeaderboard } from "../engines/leaderboard.engine.ts";
import { botStocksForDay, restoreBotPortfolios } from "./bot-state.service.ts";

export async function endDay(gameId: string, input: VersionRequest, key: string) {
  // Read a consistent snapshot, then run the pure engines outside the write transaction.
  const snapshot = await prisma.$transaction((tx) => findGame(tx, gameId), { isolationLevel: "RepeatableRead" });
  let simulation: ReturnType<typeof buildDailyReport> | undefined;
  let loanAccrual: LoanAccrual | null = null;
  let botPortfolios: BotPortfolio[] | undefined;
  if (snapshot && snapshot.phase === "TRADING" && snapshot.version === input.expectedVersion) {
    const state = toGameState(snapshot);
    if (state.prediction) {
      const news = getDailyNews(snapshot.seed, snapshot.day);
      botPortfolios = closeBotDay(planBotDay(restoreBotPortfolios(snapshot), {
        seed: snapshot.seed, day: snapshot.day, news, stocks: botStocksForDay(snapshot, snapshot.day),
      }), snapshot.day);
      const results = snapshot.holdings.map(({ stock }) => {
        const currentPricePence = state.stocks.find((item) => item.id === stock.id)!.pricePence;
        const previous = snapshot.prices.find((item) => item.stockID === stock.id && item.day === Math.max(0, snapshot.lastSimulatedDay - 1))!;
        const momentum = snapshot.day === 1 ? 0 : clamp((currentPricePence / previous.pricePence - 1) / .1, -1, 1);
        const crowd = simulateCrowd({ seed: snapshot.seed, day: snapshot.day, stockId: stock.id as StockId,
          newsSignal: news.affectedStockIds.includes(stock.id as StockId) ? news.impact : 0, momentum });
        return simulateMarket({ seed: snapshot.seed, day: snapshot.day, currentPricePence, volatility: stock.volatility, crowd });
      }).sort((a, b) => a.stockId.localeCompare(b.stockId));
      const interest = calculateInterest(state.wallet.savingsPence, state.wallet.monthlyInterestBps);
      const arbitrage = snapshot.arbitrageAttempts.find((item) => item.day === snapshot.day)?.profitPence ?? 0;
      const activeLoan = snapshot.loans.find((loan) => loan.status === "ACTIVE") ?? null;
      loanAccrual = accrueLoan(activeLoan, snapshot.day, snapshot.loanLockedThroughDay);
      const earlierCharges = snapshot.loanEvents.filter((event) => event.day === snapshot.day
        && (event.type === "INTEREST" || event.type === "PENALTY")).reduce((sum, event) => sum + event.amountPence, 0);
      simulation = buildDailyReport(state, results, interest, arbitrage, {
        interestPence: earlierCharges + (loanAccrual?.interestPence ?? 0),
        accruedInterestPence: loanAccrual?.interestPence ?? 0,
        balancePence: loanAccrual?.balancePence ?? activeLoan?.balancePence ?? 0,
      }, news.category);
      simulation.leaderboard = buildLeaderboard(botPortfolios,
        results.map((result) => ({ id: result.stockId, pricePence: result.nextPricePence })), {
          cashPence: state.wallet.cashPence,
          savingsPence: state.wallet.savingsPence + interest,
          stockValuePence: state.stocks.reduce((sum, stock) => sum + stock.quantityHeld
            * results.find((result) => result.stockId === stock.id)!.nextPricePence, 0),
          debtPence: loanAccrual?.balancePence ?? activeLoan?.balancePence ?? 0,
        }, snapshot.day, snapshot.day);
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
      if (!simulation || !botPortfolios || snapshot?.version !== game.version || !game.wallet) {
        throw new AppError(409, "VERSION_CONFLICT", "Your game has changed. Reload and try again.");
      }
      await persistLoanAccrual(tx, game.id, game.day, loanAccrual);
      await persistDayClose(tx, game, simulation, checkedPence(game.wallet.savingsPence + simulation.interestPence), botPortfolios);
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
