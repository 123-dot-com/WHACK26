import type { CrowdResult, MarketResult } from "@bullish/shared";
import { checkedPence } from "../lib/money.ts";
import { clamp, seededRandom } from "./random.ts";

export function simulateMarket(input: {
  seed: number; day: number; currentPricePence: number; volatility: number;
  crowd: CrowdResult; marketNoise?: number;
}): MarketResult {
  const { crowd, currentPricePence } = input;
  const noise = input.marketNoise ?? (seededRandom(input.seed, input.day, crowd.stockId, "marketNoise")() - .5) * .01;
  const contribution = .08 * input.volatility * crowd.pressure;
  const rawReturn = contribution + noise;
  const cappedReturn = clamp(rawReturn, -.1, .1);
  // Whole-penny ticks remain within the 10% band, including penny-priced stocks.
  const minimum = Math.max(1, Math.ceil(currentPricePence * 9 / 10));
  const maximum = Math.floor(currentPricePence * 11 / 10);
  const nextPricePence = checkedPence(clamp(Math.round(currentPricePence * (1 + cappedReturn)), minimum, maximum));
  const actualReturn = (nextPricePence - currentPricePence) / currentPricePence;
  const capAdjustmentPct = (cappedReturn - rawReturn) * 100;
  const roundingAdjustmentPct = (actualReturn - cappedReturn) * 100;
  return { ...crowd, previousPricePence: currentPricePence, nextPricePence,
    returnPct: actualReturn * 100, crowdContributionPct: contribution * 100,
    noiseContributionPct: noise * 100, capAdjustmentPct, roundingAdjustmentPct,
    explanation: `${crowd.buyCount} investors voted BUY, ${crowd.sellCount} voted SELL and ${crowd.holdCount} voted HOLD. `
      + `Crowd pressure contributed ${(contribution * 100).toFixed(2)} percentage points; noise contributed ${(noise * 100).toFixed(2)}.`
      + (Math.abs(capAdjustmentPct) > .000001 ? ` The 10% cap adjusted the return by ${capAdjustmentPct.toFixed(2)} points.` : "")
      + (Math.abs(roundingAdjustmentPct) > .000001 ? ` Whole-penny ticks adjusted it by ${roundingAdjustmentPct.toFixed(4)} points.` : ""),
  };
}
