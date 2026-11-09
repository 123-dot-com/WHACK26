import type { ArbitragePuzzleDTO, ArbitrageRequest } from "@bullish/shared";
import { describe, expect, it } from "vitest";
import { arbitrageTemplates } from "../data/arbitrage.ts";
import { calculateArbitrage, createArbitrageMarket, findArbitrageOrder } from "../engines/arbitrage.engine.ts";
import { AppError } from "../lib/app-error.ts";

const water: ArbitragePuzzleDTO = { puzzleId: "water-D1", title: "Water Depot", unitName: "bottles", completedToday: false,
  items: [
    { id: "pack-1", name: "Bottle", units: 1, buyPricePence: 125, sellPricePence: 110 },
    { id: "pack-4", name: "Case of 4", units: 4, buyPricePence: 460, sellPricePence: 440 },
    { id: "pack-6", name: "Case of 6", units: 6, buyPricePence: 600, sellPricePence: 570 },
    { id: "pack-12", name: "Case of 12", units: 12, buyPricePence: 1260, sellPricePence: 1200 },
  ] };
const order: ArbitrageRequest = { puzzleId: water.puzzleId, expectedVersion: 0, orders: [
  { itemId: "pack-6", buyQuantity: 2, sellQuantity: 0 },
  { itemId: "pack-4", buyQuantity: 0, sellQuantity: 3 },
] };

describe("daily arbitrage selection", () => {
  it("has 60 distinct problems with 20 each of two, three and four formats", () => {
    expect(arbitrageTemplates).toHaveLength(60);
    expect(new Set(arbitrageTemplates.map((item) => item.id)).size).toBe(60);
    for (const count of [2, 3, 4]) expect(arbitrageTemplates.filter((item) => item.sizes.length === count)).toHaveLength(20);
  });

  it("selects three repeatable stalls per day, covers the catalog and avoids repeats across all three days", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 150; seed++) {
      const selected: string[] = [];
      for (let day = 1; day <= 3; day++) {
        const market = createArbitrageMarket(seed, day);
        expect(market.stalls).toHaveLength(3);
        expect(createArbitrageMarket(seed, day)).toEqual(market);
        for (const stall of market.stalls) {
          selected.push(stall.title);
          seen.add(stall.title);
          expect(stall.items.length).toBeGreaterThanOrEqual(2);
          expect(stall.items.length).toBeLessThanOrEqual(4);
          expect(stall).not.toHaveProperty("profitPence");
          expect(stall).not.toHaveProperty("costPence");
          for (const item of stall.items) {
            expect(Number.isSafeInteger(item.buyPricePence)).toBe(true);
            expect(item.buyPricePence).toBeGreaterThan(item.sellPricePence);
            expect(item.sellPricePence).toBeGreaterThan(0);
          }
        }
      }
      expect(new Set(selected).size).toBe(9);
    }
    expect(seen.size).toBe(60);
    expect(createArbitrageMarket(1, 1)).not.toEqual(createArbitrageMarket(2, 1));
  });

  it("changes only completion flags when a stall is traded, keeping its prices stable", () => {
    const market = createArbitrageMarket(2026, 1);
    const completed = createArbitrageMarket(2026, 1, [market.stalls[1].puzzleId]);
    expect(completed.stalls.map((stall) => stall.completedToday)).toEqual([false, true, false]);
    expect(completed.stalls.map((stall) => stall.items)).toEqual(market.stalls.map((stall) => stall.items));
  });

  it.each([0, 4, 1.5])("rejects unsupported day %s", (day) => {
    expect(() => createArbitrageMarket(1, day)).toThrow(RangeError);
  });
});

describe("arbitrage basket settlement", () => {
  it("converts two six-packs into three four-packs and settles the exact penny result", () => {
    expect(calculateArbitrage(water, order, 2000)).toEqual({ quantity: 12, costPence: 1200,
      revenuePence: 1320, profitPence: 120, cashPence: 2120 });
  });

  it("accepts mixed purchases and losing choices without an automatic profit gate", () => {
    const mixed = { ...order, orders: [
      { itemId: "pack-1", buyQuantity: 2, sellQuantity: 0 },
      { itemId: "pack-4", buyQuantity: 1, sellQuantity: 0 },
      { itemId: "pack-6", buyQuantity: 0, sellQuantity: 1 },
    ] };
    expect(calculateArbitrage(water, mixed, 1000)).toMatchObject({ quantity: 6, costPence: 710,
      revenuePence: 570, profitPence: -140, cashPence: 860 });
  });

  it("requires the full purchase cost before receiving any sale proceeds", () => {
    expect(() => calculateArbitrage(water, order, 1199)).toThrow("before selling");
  });

  it.each([
    [{ itemId: "pack-6", buyQuantity: 1, sellQuantity: 0 }],
    [{ itemId: "pack-1", buyQuantity: 0, sellQuantity: 10 }],
    [{ itemId: "pack-1", buyQuantity: 0, sellQuantity: 0 }],
    [{ itemId: "pack-6", buyQuantity: 1, sellQuantity: 0 }, { itemId: "pack-4", buyQuantity: 0, sellQuantity: 1 }],
    [{ itemId: "unknown", buyQuantity: 1, sellQuantity: 1 }],
    [{ itemId: "pack-1", buyQuantity: 1, sellQuantity: 0 }, { itemId: "pack-1", buyQuantity: 0, sellQuantity: 1 }],
    [{ itemId: "pack-1", buyQuantity: -1, sellQuantity: 1 }],
    [{ itemId: "pack-1", buyQuantity: 1.5, sellQuantity: 1.5 }],
  ].map((orders) => ({ orders })))("rejects invalid baskets: $orders", ({ orders }) => {
    expect(() => calculateArbitrage(water, { ...order, orders }, 100_000)).toThrow(AppError);
  });

  it("rejects a completed or mismatched stall and integer overflow", () => {
    expect(() => calculateArbitrage({ ...water, completedToday: true }, order, 2000)).toThrow("already traded");
    expect(() => calculateArbitrage(water, { ...order, puzzleId: "coffee-D1" }, 2000)).toThrow("today's puzzle");
    expect(() => calculateArbitrage(water, { ...order, orders: [
      { itemId: "pack-1", buyQuantity: 2_147_483_647, sellQuantity: 2_147_483_647 },
    ] }, 2_147_483_647)).toThrow("limit");
  });

  it("lets bots find a funded repacking order and skip stalls without profitable routes", () => {
    const chosen = findArbitrageOrder(water, 1000)!;
    expect(chosen).not.toBeNull();
    const result = calculateArbitrage(water, chosen, 1000);
    expect(result.costPence).toBeLessThanOrEqual(1000);
    expect(result.profitPence).toBeGreaterThan(0);
    expect(findArbitrageOrder(water, 0)).toBeNull();
    const expensive = { ...water, items: water.items.map((item) => ({ ...item,
      buyPricePence: item.units * 200, sellPricePence: item.units * 100 })) };
    expect(findArbitrageOrder(expensive, 1_000_000)).toBeNull();
  });
});
