import type { ArbitrageRequest } from "@bullish/shared";
import { calculateArbitrage, createArbitrageMarket, DAILY_STALL_COUNT } from "../engines/arbitrage.engine.ts";
import { AppError } from "../lib/app-error.ts";
import { persistArbitrage } from "../repositories/gameplay.repository.ts";
import { prisma } from "../lib/prisma.ts";
import { mutateGame } from "./game-mutation.service.ts";

export async function getArbitrageMarket(gameId: string) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.gameSession.findUnique({ where: { id: gameId },
      select: { seed: true, day: true, version: true, arbitrageAttempts: { select: { day: true, puzzleId: true } } } });
    if (!game) throw new AppError(404, "NOT_FOUND", "Game not found.");
    const completedIds = game.arbitrageAttempts.filter((item) => item.day === game.day).map((item) => item.puzzleId);
    return { market: createArbitrageMarket(game.seed, game.day, completedIds), version: game.version };
  }, { isolationLevel: "RepeatableRead" });
}

export function executeArbitrage(gameId: string, input: ArbitrageRequest, key: string) {
  return mutateGame({ gameId, key, operation: "arbitrage", input, phases: ["TRADING"],
    apply: async (tx, game) => {
      if (!game.wallet) throw new Error("Game wallet is missing.");
      const completedIds = game.arbitrageAttempts.filter((item) => item.day === game.day).map((item) => item.puzzleId);
      if (completedIds.length >= DAILY_STALL_COUNT) throw new AppError(409, "ARBITRAGE_ALREADY_COMPLETED", "Today's three stall trades are complete.");
      const puzzle = createArbitrageMarket(game.seed, game.day, completedIds).stalls.find((stall) => stall.puzzleId === input.puzzleId);
      if (!puzzle) throw new AppError(422, "INVALID_PUZZLE", "Choose one of today's three market stalls.");
      await persistArbitrage(tx, game, input, calculateArbitrage(puzzle, input, game.wallet.cashPence));
    },
  });
}
