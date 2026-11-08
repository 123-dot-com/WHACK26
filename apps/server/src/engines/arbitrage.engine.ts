import type { ArbitragePuzzleDTO, ArbitrageRequest } from "@bullish/shared";
import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";

export function createPuzzle(day: number, completedToday: boolean): ArbitragePuzzleDTO {
  return { puzzleId: `OIL-D${day}`, bundleSize: 3, unitBuyPence: 2500,
    unitSellPence: 2400, bundleBuyPence: 6900, bundleSellPence: 6800, completedToday };
}

export function calculateArbitrage(
  puzzle: ArbitragePuzzleDTO, input: ArbitrageRequest, cashPence: number,
) {
  if (input.puzzleId !== puzzle.puzzleId) {
    throw new AppError(422, "INVALID_PUZZLE", "This puzzle is not today's puzzle.");
  }
  if (puzzle.completedToday) {
    throw new AppError(409, "ARBITRAGE_ALREADY_COMPLETED", "You have already used today's arbitrage attempt.");
  }
  const bundleFirst = input.route === "BUY_BUNDLE_SELL_UNITS";
  const costPence = checkedPence(input.quantity * (bundleFirst
    ? puzzle.bundleBuyPence : puzzle.unitBuyPence * puzzle.bundleSize));
  const revenuePence = checkedPence(input.quantity * (bundleFirst
    ? puzzle.unitSellPence * puzzle.bundleSize : puzzle.bundleSellPence));
  if (costPence > cashPence) {
    throw new AppError(422, "INSUFFICIENT_CASH", "Current Cash must cover the full purchase cost.");
  }
  const profitPence = revenuePence - costPence;
  return { costPence, revenuePence, profitPence,
    cashPence: checkedPence(cashPence + profitPence) };
}
