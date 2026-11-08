import type { AgentGroup, CrowdResult, StockId } from "@bullish/shared";
import { clamp, seededRandom } from "./random.ts";

const groups: Array<{ type: AgentGroup; count: number; news: number; momentum: number; bias: number; threshold: number }> = [
  { type: "OPTIMIST", count: 20, news: .9, momentum: .2, bias: .15, threshold: .22 },
  { type: "PESSIMIST", count: 20, news: 1, momentum: .15, bias: -.2, threshold: .22 },
  { type: "FOMO", count: 20, news: .3, momentum: 1.2, bias: .05, threshold: .22 },
  { type: "PANIC", count: 15, news: .6, momentum: 1, bias: -.1, threshold: .22 },
  { type: "LONG_TERM", count: 15, news: .35, momentum: .15, bias: 0, threshold: .5 },
  { type: "ANALYST", count: 10, news: 1.1, momentum: .3, bias: 0, threshold: .22 },
];

export function simulateCrowd(context: {
  seed: number; day: number; stockId: StockId; newsSignal: number; momentum: number;
}): CrowdResult {
  const random = seededRandom(context.seed, context.day, context.stockId, "agentNoise");
  const byGroup = {} as CrowdResult["byGroup"];
  let buyCount = 0, sellCount = 0, holdCount = 0;
  for (const group of groups) {
    const counts = { buy: 0, sell: 0, hold: 0 };
    for (let i = 0; i < group.count; i++) {
      let newsWeight = group.news;
      if (group.type === "OPTIMIST" && context.newsSignal > 0) newsWeight *= 1.25;
      if (group.type === "PESSIMIST" && context.newsSignal < 0) newsWeight *= 1.25;
      let momentumWeight = group.momentum;
      if (group.type === "FOMO" && context.momentum < 0) momentumWeight *= .25;
      if (group.type === "PANIC" && context.momentum > 0) momentumWeight *= .25;
      const score = newsWeight * clamp(context.newsSignal, -1, 1)
        + momentumWeight * clamp(context.momentum, -1, 1) + group.bias + (random() - .5) * .3;
      if (score > group.threshold) counts.buy++;
      else if (score < -group.threshold) counts.sell++;
      else counts.hold++;
    }
    byGroup[group.type] = counts;
    buyCount += counts.buy; sellCount += counts.sell; holdCount += counts.hold;
  }
  return { stockId: context.stockId, buyCount, sellCount, holdCount,
    pressure: (buyCount - sellCount) / 100, byGroup };
}
