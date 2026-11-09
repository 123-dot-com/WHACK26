import type { DailyReportDTO, GameStateDTO, MarketResult, NewsDTO, PredictionDirection } from "@bullish/shared";

const takeaways = {
  GOOD: "Positive news can create buying pressure. Momentum and market noise can still change the outcome.",
  BAD: "Negative news can create selling pressure. Stock exposure creates both opportunities and losses; savings provide liquidity and steady interest.",
  NEUTRAL: "Quiet headlines do not guarantee flat prices. Momentum, investor bias and market noise can still move the market.",
};

export function classifyReturn(previousPricePence: number, nextPricePence: number): PredictionDirection {
  const difference = (nextPricePence - previousPricePence) * 100;
  return difference > previousPricePence ? "BULLISH" : difference < -previousPricePence ? "BEARISH" : "NEUTRAL";
}

export function buildDailyReport(
  game: GameStateDTO, marketResults: MarketResult[], interestPence: number, arbitragePnlPence: number,
  loan: { interestPence: number; accruedInterestPence: number; balancePence: number } = { interestPence: 0, accruedInterestPence: 0, balancePence: 0 },
  newsCategory: NewsDTO["category"] = "NEUTRAL",
): DailyReportDTO {
  if (!game.prediction) throw new Error("A prediction is required to build a report.");
  const focused = marketResults.find((result) => result.stockId === game.prediction!.stockId);
  if (!focused) throw new Error("Focus stock result is missing.");
  const actual = classifyReturn(focused.previousPricePence, focused.nextPricePence);
  const marketPnlPence = game.stocks.reduce((sum, stock) => {
    const result = marketResults.find((item) => item.stockId === stock.id)!;
    return sum + stock.quantityHeld * (result.nextPricePence - result.previousPricePence);
  }, 0);
  const stockValue = game.stocks.reduce((sum, stock) => sum + stock.quantityHeld * stock.pricePence, 0);
  const grossAssetsPence = game.netWorthPence + (game.loan.active?.balancePence ?? 0);
  return { day: game.day,
    prediction: { stockId: game.prediction.stockId, chosen: game.prediction.direction,
      actual, correct: game.prediction.direction === actual },
    marketResults, marketPnlPence, interestPence, arbitragePnlPence,
    loanInterestPence: loan.interestPence, loanBalancePence: loan.balancePence,
    // Arbitrage has already settled in the snapshot's cash: do not add it twice.
    netWorthPence: game.netWorthPence + marketPnlPence + interestPence - loan.accruedInterestPence,
    exposurePct: grossAssetsPence === 0 ? 0 : stockValue / grossAssetsPence * 100,
    takeaway: takeaways[newsCategory],
  };
}
