import type { ArbitrageMarketDTO, ArbitragePuzzleDTO, ArbitrageRequest } from "@bullish/shared";
import { arbitrageTemplates } from "../data/arbitrage.ts";
import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";
import { seededRandom } from "./random.ts";

export const DAILY_STALL_COUNT = 3;

export function createArbitrageMarket(seed: number, day: number, completedPuzzleIds: readonly string[] = []): ArbitrageMarketDTO {
  if (!Number.isInteger(day) || day < 1 || day > 3) throw new RangeError("Arbitrage is only available on days 1 to 3.");
  const templates = [...arbitrageTemplates];
  const select = seededRandom(seed, 0, "MARKET", "arbitrageSelection");
  for (let index = templates.length - 1; index > 0; index--) {
    const other = Math.floor(select() * (index + 1));
    [templates[index], templates[other]] = [templates[other], templates[index]];
  }
  const stalls = templates.slice((day - 1) * DAILY_STALL_COUNT, day * DAILY_STALL_COUNT).map((template) => {
    const random = seededRandom(seed, day, template.id, "arbitragePrices");
    const base = template.basePricePence * (.85 + random() * .3);
    const opportunity = random() >= .2;
    const cheap = Math.floor(random() * template.sizes.length);
    const premium = (cheap + 1 + Math.floor(random() * (template.sizes.length - 1))) % template.sizes.length;
    const items = template.sizes.map((units, index) => {
      let buy = base * units * (1.04 + random() * .12);
      let sell = base * units * (.88 + random() * .12);
      if (opportunity && index === cheap) buy = base * units * (.97 + random() * .03);
      if (opportunity && index === premium) sell = base * units * (1.01 + random() * .04);
      const buyPricePence = Math.max(2, Math.round(Math.max(buy, sell * 1.03)));
      return { id: `pack-${units}`, name: units === 1 ? template.singleName : `${template.packName} of ${units}`,
        units, buyPricePence, sellPricePence: Math.max(1, Math.min(buyPricePence - 1, Math.round(sell))) };
    });
    const puzzleId = `${template.id}-D${day}`;
    return { puzzleId, title: template.title, unitName: template.unitName, items,
      completedToday: completedPuzzleIds.includes(puzzleId) || completedPuzzleIds.length >= DAILY_STALL_COUNT };
  });
  return { day, stalls };
}

export function calculateArbitrage(
  puzzle: ArbitragePuzzleDTO, input: ArbitrageRequest, cashPence: number,
) {
  if (input.puzzleId !== puzzle.puzzleId) {
    throw new AppError(422, "INVALID_PUZZLE", "This puzzle is not today's puzzle.");
  }
  if (puzzle.completedToday) {
    throw new AppError(409, "ARBITRAGE_ALREADY_COMPLETED", "You have already traded at this stall today.");
  }
  const seen = new Set<string>();
  let cost = 0n, revenue = 0n, boughtUnits = 0n, soldUnits = 0n;
  for (const order of input.orders) {
    const item = puzzle.items.find((item) => item.id === order.itemId);
    if (!item) throw new AppError(422, "INVALID_ITEM", "Choose only items from this stall.");
    if (seen.has(item.id)) throw new AppError(422, "DUPLICATE_ITEM", "List each item only once.");
    seen.add(item.id);
    if (!Number.isSafeInteger(order.buyQuantity) || order.buyQuantity < 0
      || !Number.isSafeInteger(order.sellQuantity) || order.sellQuantity < 0) {
      throw new AppError(422, "INVALID_QUANTITY", "Enter nonnegative whole quantities.");
    }
    cost += BigInt(order.buyQuantity) * BigInt(item.buyPricePence);
    revenue += BigInt(order.sellQuantity) * BigInt(item.sellPricePence);
    boughtUnits += BigInt(order.buyQuantity) * BigInt(item.units);
    soldUnits += BigInt(order.sellQuantity) * BigInt(item.units);
  }
  if (boughtUnits === 0n || soldUnits === 0n) {
    throw new AppError(422, "EMPTY_ORDER", "Choose quantities to buy and sell.");
  }
  if (boughtUnits !== soldUnits) {
    throw new AppError(422, "UNBALANCED_ORDER", `Buy and sell the same total number of ${puzzle.unitName}. You may repack between sizes.`);
  }
  const quantity = checkedPence(Number(boughtUnits));
  const costPence = checkedPence(Number(cost));
  const revenuePence = checkedPence(Number(revenue));
  if (costPence > cashPence) {
    throw new AppError(422, "INSUFFICIENT_CASH", "You do not have enough cash to pay for your selected purchases before selling.");
  }
  const profitPence = revenuePence - costPence;
  return { costPence, revenuePence, profitPence, quantity,
    cashPence: checkedPence(cashPence + profitPence) };
}

// Bots compare feasible repacking pairs using the same public prices as players.
export function findArbitrageOrder(puzzle: ArbitragePuzzleDTO, budgetPence: number): ArbitrageRequest | null {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  let best: ArbitrageRequest | null = null, bestProfit = 0;
  for (const buy of puzzle.items) {
    for (const sell of puzzle.items) {
      if (buy.id === sell.id) continue;
      const divisor = gcd(buy.units, sell.units);
      const buyCount = sell.units / divisor, sellCount = buy.units / divisor;
      const cost = buyCount * buy.buyPricePence;
      const profit = sellCount * sell.sellPricePence - cost;
      const cycles = Math.floor(budgetPence / cost);
      if (cycles > 0 && profit * cycles > bestProfit) {
        bestProfit = profit * cycles;
        best = { puzzleId: puzzle.puzzleId, expectedVersion: 0, orders: [
          { itemId: buy.id, buyQuantity: buyCount * cycles, sellQuantity: 0 },
          { itemId: sell.id, buyQuantity: 0, sellQuantity: sellCount * cycles },
        ] };
      }
    }
  }
  return best;
}
