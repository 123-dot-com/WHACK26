import { describe, expect, it } from "vitest";
import { calculateArbitrage, createPuzzle } from "../engines/arbitrage.engine.ts";
import { calculateInterest, calculateTransfer } from "../engines/bank.engine.ts";
import { simulateCrowd } from "../engines/crowd.engine.ts";
import { simulateMarket } from "../engines/market.engine.ts";
import { classifyReturn } from "../engines/report.engine.ts";
import { calculateTrade } from "../engines/trading.engine.ts";

describe("pure financial calculations", () => {
  it("buys and sells at the authoritative price without changing wealth", () => {
    expect(calculateTrade(1_000_000, 0, 10_000, { side: "BUY", quantity: 20 }))
      .toEqual({ cashPence: 800_000, quantity: 20, totalPence: 200_000 });
    expect(calculateTrade(800_000, 20, 10_000, { side: "SELL", quantity: 5 }))
      .toEqual({ cashPence: 850_000, quantity: 15, totalPence: 50_000 });
  });
  it("rejects insufficient funds, short sales and amounts outside database limits", () => {
    expect(() => calculateTrade(1_000_000, 0, 10_000, { side: "BUY", quantity: 101 })).toThrow("Not enough");
    expect(() => calculateTrade(0, 20, 10_000, { side: "SELL", quantity: 21 })).toThrow("cannot sell");
    expect(() => calculateTrade(1, 0, 2_147_483_647, { side: "BUY", quantity: 2_147_483_647 })).toThrow("limit");
  });
  it("conserves money in transfers and rounds monthly interest to a penny", () => {
    expect(calculateTransfer(1_000_000, 0, 200_000, "DEPOSIT")).toEqual({ cashPence: 800_000, savingsPence: 200_000 });
    expect(calculateTransfer(800_000, 200_000, 50_000, "WITHDRAW")).toEqual({ cashPence: 850_000, savingsPence: 150_000 });
    expect(calculateInterest(200_000, 400)).toBe(667);
    expect(calculateInterest(0, 400)).toBe(0);
    expect(calculateInterest(150, 400)).toBe(1);
    expect(() => calculateTransfer(0, 100, 101, "WITHDRAW")).toThrow("Not enough");
  });
  it("settles both arbitrage routes and checks gross purchase cost", () => {
    const puzzle = createPuzzle(1, false);
    const input = { puzzleId: puzzle.puzzleId, route: "BUY_BUNDLE_SELL_UNITS" as const, quantity: 1, expectedVersion: 0 };
    expect(calculateArbitrage(puzzle, input, 10_000)).toEqual({ costPence: 6900, revenuePence: 7200, profitPence: 300, cashPence: 10_300 });
    expect(calculateArbitrage(puzzle, { ...input, route: "BUY_UNITS_SELL_BUNDLE" }, 10_000).profitPence).toBe(-700);
    expect(() => calculateArbitrage(puzzle, input, 6899)).toThrow("full purchase cost");
  });
});

describe("deterministic crowd and market", () => {
  const context = { seed: 2026, day: 1, stockId: "NOVA" as const, newsSignal: .8, momentum: 0 };
  it("casts exactly 100 votes across the specified six populations", () => {
    const crowd = simulateCrowd(context);
    expect(crowd.buyCount + crowd.sellCount + crowd.holdCount).toBe(100);
    expect(Object.values(crowd.byGroup).map((group) => group.buy + group.sell + group.hold)).toEqual([20, 20, 20, 15, 15, 10]);
    expect(crowd.pressure).toBe((crowd.buyCount - crowd.sellCount) / 100);
    expect(simulateCrowd(context)).toEqual(crowd);
  });
  it("keeps results independent of stock processing order", () => {
    const run = (ids: Array<"NOVA" | "GREEN" | "FINX">) => Object.fromEntries(ids.map((stockId) => {
      const crowd = simulateCrowd({ ...context, stockId });
      return [stockId, simulateMarket({ seed: 2026, day: 1, currentPricePence: 10_000, volatility: 1.2, crowd })];
    }));
    expect(run(["NOVA", "GREEN", "FINX"])).toEqual(run(["FINX", "NOVA", "GREEN"]));
  });
  it.each([
    [.5, 1.2, 10_480], [-.5, 1, 9600], [0, 1, 10_000], [1, 100, 11_000], [-1, 100, 9000],
  ])("prices pressure %s and volatility %s at %s pence", (pressure, volatility, expected) => {
    const crowd = { ...simulateCrowd(context), pressure };
    const result = simulateMarket({ seed: 1, day: 1, currentPricePence: 10_000, volatility, marketNoise: 0, crowd });
    expect(result.nextPricePence).toBe(expected);
    expect(result.crowdContributionPct + result.noiseContributionPct + result.capAdjustmentPct + result.roundingAdjustmentPct)
      .toBeCloseTo(result.returnPct, 9);
  });
  it.each([1, 2, 9, 11, 101])("keeps whole-penny price %s within the 10%% band", (price) => {
    for (const pressure of [-1, 1]) {
      const result = simulateMarket({ seed: 1, day: 1, currentPricePence: price,
        volatility: 100, marketNoise: 0, crowd: { ...simulateCrowd(context), pressure } });
      expect(result.nextPricePence).toBeGreaterThanOrEqual(1);
      expect(Math.abs(result.returnPct)).toBeLessThanOrEqual(10.000000001);
    }
  });
  it("treats exactly plus/minus 1% as neutral", () => {
    expect(classifyReturn(10_000, 10_100)).toBe("NEUTRAL");
    expect(classifyReturn(10_000, 9900)).toBe("NEUTRAL");
    expect(classifyReturn(10_000, 10_101)).toBe("BULLISH");
    expect(classifyReturn(10_000, 9899)).toBe("BEARISH");
  });
});
