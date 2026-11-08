import type { ArbitrageRequest } from "@bullish/shared";
import { calculateArbitrage, createPuzzle } from "../engines/arbitrage.engine.ts";
import { AppError } from "../lib/app-error.ts";
import { persistArbitrage } from "../repositories/gameplay.repository.ts";
import { getGame } from "./game.service.ts";
import { mutateGame } from "./game-mutation.service.ts";

export async function getPuzzle(gameId: string) {
  const game = await getGame(gameId);
  if (!game) throw new AppError(404, "NOT_FOUND", "Game not found.");
  return { puzzle: createPuzzle(game.day, game.arbitrage.completedToday), version: game.version };
}

export function executeArbitrage(gameId: string, input: ArbitrageRequest, key: string) {
  return mutateGame({ gameId, key, operation: "arbitrage", input, phases: ["TRADING"],
    apply: async (tx, game) => {
      if (!game.wallet) throw new Error("Game wallet is missing.");
      const puzzle = createPuzzle(game.day, game.arbitrageAttempts.some((item) => item.day === game.day));
      await persistArbitrage(tx, game, input, calculateArbitrage(puzzle, input, game.wallet.cashPence));
    },
  });
}
