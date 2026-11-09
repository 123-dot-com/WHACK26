import type { ArbitrageRequest, DailyReportDTO, TradeRequest } from "@bullish/shared";
import type { Prisma } from "../generated/prisma/client.ts";
import type { GameData, Transaction } from "./game.repository.ts";
import type { BotPortfolio } from "../engines/bot.engine.ts";

export async function persistTrade(tx: Transaction, game: GameData, input: TradeRequest,
  pricePence: number, result: { cashPence: number; quantity: number; totalPence: number }) {
  await tx.wallet.update({ where: { gameId: game.id }, data: { cashPence: result.cashPence } });
  await tx.holding.update({ where: { gameID_stockID: { gameID: game.id, stockID: input.stockId } },
    data: { quantity: result.quantity } });
  await tx.trade.create({ data: { gameId: game.id, day: game.day, stockId: input.stockId,
    side: input.side, quantity: input.quantity, pricePence, totalPence: result.totalPence } });
}

export async function persistTransfer(tx: Transaction, game: GameData, operation: "DEPOSIT" | "WITHDRAW",
  amountPence: number, balances: { cashPence: number; savingsPence: number }) {
  await tx.wallet.update({ where: { gameId: game.id }, data: balances });
  await tx.bankTransaction.create({ data: { gameId: game.id, day: game.day, operation, amountPence } });
}

export async function persistArbitrage(tx: Transaction, game: GameData, input: ArbitrageRequest,
  result: { costPence: number; revenuePence: number; profitPence: number; quantity: number; cashPence: number }) {
  const { cashPence, ...settlement } = result;
  await tx.wallet.update({ where: { gameId: game.id }, data: { cashPence } });
  await tx.arbitrageAttempt.create({ data: { gameId: game.id, day: game.day,
    puzzleId: input.puzzleId, route: "MARKET_BASKET", orders: input.orders, ...settlement } });
}

export async function persistDayClose(tx: Transaction, game: GameData, report: DailyReportDTO,
  savingsPence: number, botPortfolios: BotPortfolio[]) {
  await tx.stockPrice.createMany({ data: report.marketResults.map((result) => ({
    gameID: game.id, stockID: result.stockId, day: game.day, pricePence: result.nextPricePence,
  })) });
  await tx.wallet.update({ where: { gameId: game.id }, data: { savingsPence } });
  await tx.bankTransaction.create({ data: { gameId: game.id, day: game.day,
    operation: "INTEREST", amountPence: report.interestPence } });
  await tx.dailyReport.create({ data: { gameId: game.id, day: game.day,
    details: JSON.parse(JSON.stringify({ ...report, botPortfolios })) as Prisma.InputJsonValue } });
  await tx.gameSession.update({ where: { id: game.id }, data: {
    lastSimulatedDay: game.day, phase: game.day === 3 ? "FINISHED" : "REPORT",
  } });
}

export function advanceDay(tx: Transaction, game: GameData) {
  return tx.gameSession.update({ where: { id: game.id }, data: { day: game.day + 1, phase: "BRIEFING" } });
}

export async function resetGame(tx: Transaction, game: GameData) {
  // Retain access, seed, monotonic version and old request keys so delayed retries stay harmless.
  await tx.trade.deleteMany({ where: { gameId: game.id } });
  await tx.loanEvent.deleteMany({ where: { gameId: game.id } });
  await tx.loan.deleteMany({ where: { gameId: game.id } });
  await tx.bankTransaction.deleteMany({ where: { gameId: game.id } });
  await tx.arbitrageAttempt.deleteMany({ where: { gameId: game.id } });
  await tx.dailyReport.deleteMany({ where: { gameId: game.id } });
  await tx.prediction.deleteMany({ where: { gameId: game.id } });
  await tx.stockPrice.deleteMany({ where: { gameID: game.id } });
  await tx.holding.updateMany({ where: { gameID: game.id }, data: { quantity: 0 } });
  await tx.stockPrice.createMany({ data: game.holdings.map(({ stock }) => ({
    gameID: game.id, stockID: stock.id, day: 0, pricePence: stock.initialPricePence,
  })) });
  await tx.wallet.update({ where: { gameId: game.id },
    data: { cashPence: 1_000_000, savingsPence: 0, monthlyInterestBps: 200, savingsDepositLimitPence: 500_000 } });
  await tx.gameSession.update({ where: { id: game.id }, data: { day: 1, phase: "BRIEFING", lastSimulatedDay: 0, loanLockedThroughDay: 0 } });
}
