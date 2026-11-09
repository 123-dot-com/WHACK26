import { buildLeaderboard } from "../engines/leaderboard.engine.ts";
import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import { findGame } from "../repositories/game.repository.ts";
import { restoreBotPortfolios } from "./bot-state.service.ts";
import { toGameState } from "./game-state.mapper.ts";

export function getLeaderboard(gameId: string) {
  return prisma.$transaction(async (tx) => {
    const game = await findGame(tx, gameId);
    if (!game) throw new AppError(404, "NOT_FOUND", "Game not found.");
    const state = toGameState(game);
    const leaderboard = buildLeaderboard(restoreBotPortfolios(game), state.stocks, {
      cashPence: state.wallet.cashPence,
      savingsPence: state.wallet.savingsPence,
      stockValuePence: state.stocks.reduce((sum, stock) => sum + stock.quantityHeld * stock.pricePence, 0),
      debtPence: state.loan.active?.balancePence ?? 0,
    }, game.day, game.lastSimulatedDay);
    return { leaderboard, version: game.version };
  }, { isolationLevel: "RepeatableRead" });
}
