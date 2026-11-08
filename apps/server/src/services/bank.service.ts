import type { BankTransferRequest } from "@bullish/shared";
import { calculateTransfer } from "../engines/bank.engine.ts";
import { persistTransfer } from "../repositories/gameplay.repository.ts";
import { mutateGame } from "./game-mutation.service.ts";

export function transferMoney(gameId: string, input: BankTransferRequest, key: string,
  operation: "DEPOSIT" | "WITHDRAW") {
  return mutateGame({ gameId, key, operation, input, phases: ["TRADING"],
    apply: async (tx, game) => {
      if (!game.wallet) throw new Error("Game wallet is missing.");
      const balances = calculateTransfer(game.wallet.cashPence, game.wallet.savingsPence, input.amountPence, operation,
        game.wallet.savingsDepositLimitPence);
      await persistTransfer(tx, game, operation, input.amountPence, balances);
    },
  });
}
