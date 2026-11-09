import type { ApiResponse, ArbitrageMarketDTO, ArbitragePuzzleDTO, ArbitrageRequest } from "@bullish/shared";

export function repackOrder(puzzle: ArbitragePuzzleDTO, multiplier = 1, buyIndex = 0, sellIndex = puzzle.items.length - 1) {
  const buy = puzzle.items[buyIndex], sell = puzzle.items[sellIndex];
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(buy.units, sell.units);
  const buyQuantity = sell.units / divisor * multiplier, sellQuantity = buy.units / divisor * multiplier;
  const input: Omit<ArbitrageRequest, "expectedVersion"> = { puzzleId: puzzle.puzzleId, orders: [
    { itemId: buy.id, buyQuantity, sellQuantity: 0 }, { itemId: sell.id, buyQuantity: 0, sellQuantity },
  ] };
  const costPence = buyQuantity * buy.buyPricePence, revenuePence = sellQuantity * sell.sellPricePence;
  return { input, costPence, revenuePence, profitPence: revenuePence - costPence };
}

export async function fetchArbitrageTrade(baseUrl: string, gameId: string, token: string, multiplier = 1) {
  const response = await fetch(`${baseUrl}/api/games/${gameId}/arbitrage`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json() as ApiResponse<ArbitrageMarketDTO>;
  if (response.status !== 200 || !body.success) throw new Error("Could not fetch the arbitrage market.");
  return repackOrder(body.data.stalls[0], multiplier);
}
