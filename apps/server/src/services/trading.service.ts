import type { TradeRequest } from "@bullish/shared";
import { calculateTrade } from "../engines/trading.engine.ts";
import { persistTrade } from "../repositories/gameplay.repository.ts";
import { toGameState } from "./game-state.mapper.ts";
import { mutateGame } from "./game-mutation.service.ts";

export function executeTrade(gameId: string, input: TradeRequest, key: string) {
  return mutateGame({ gameId, key, operation: "trade", input, phases: ["TRADING"],
    apply: async (tx, game) => {
      const state = toGameState(game);
      const stock = state.stocks.find((item) => item.id === input.stockId)!;
      const result = calculateTrade(state.wallet.cashPence, stock.quantityHeld, stock.pricePence, input);
      await persistTrade(tx, game, input, stock.pricePence, result);
    },
  });
}
