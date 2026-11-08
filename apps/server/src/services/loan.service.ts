import type { BorrowRequest, VersionRequest } from "@bullish/shared";
import { calculateBorrow, calculateRepayment } from "../engines/loan.engine.ts";
import { persistBorrow, persistRepayment } from "../repositories/loan.repository.ts";
import { mutateGame } from "./game-mutation.service.ts";

export function borrow(gameId: string, input: BorrowRequest, key: string) {
  return mutateGame({ gameId, key, operation: "loan/borrow", input, phases: ["TRADING"], apply: async (tx, game) => {
    if (!game.wallet) throw new Error("Game wallet is missing.");
    const active = game.loans.find((loan) => loan.status === "ACTIVE") ?? null;
    await persistBorrow(tx, game, calculateBorrow(game.wallet.cashPence, input.amountPence, game.day, active, game.loanLockedThroughDay));
  } });
}

export function repay(gameId: string, input: VersionRequest, key: string) {
  return mutateGame({ gameId, key, operation: "loan/repay", input, phases: ["TRADING"], apply: async (tx, game) => {
    if (!game.wallet) throw new Error("Game wallet is missing.");
    const active = game.loans.find((loan) => loan.status === "ACTIVE") ?? null;
    const result = calculateRepayment(game.wallet.cashPence, active);
    await persistRepayment(tx, game, active!.id, result);
  } });
}
