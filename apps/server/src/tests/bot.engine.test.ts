import type { NewsDTO } from "@bullish/shared";
import { describe, expect, it } from "vitest";
import { botStockValue, closeBotDay, createBotPortfolios, planBotDay, type BotPortfolio } from "../engines/bot.engine.ts";
import { buildLeaderboard } from "../engines/leaderboard.engine.ts";
import { decideCrowd } from "../engines/crowd.engine.ts";

const stocks = [
  { id: "NOVA" as const, pricePence: 10_000, previousPricePence: 10_000 },
  { id: "GREEN" as const, pricePence: 5_000, previousPricePence: 5_000 },
  { id: "FINX" as const, pricePence: 7_500, previousPricePence: 7_500 },
];
const news: NewsDTO = { day: 1, category: "GOOD", focusStockId: "NOVA",
  affectedStockIds: ["NOVA", "GREEN", "FINX"], headline: "Strong market news", impact: 1 };
const wealth = (bot: BotPortfolio) => bot.cashPence + bot.savingsPence + botStockValue(bot, stocks) - (bot.loan?.balancePence ?? 0);
const player = { cashPence: 1_000_000, savingsPence: 0, stockValuePence: 0, debtPence: 0 };

describe("bot finances", () => {
  it("gives the existing 100 crowd investors the same starting wealth as the player", () => {
    const bots = createBotPortfolios();
    expect(bots).toHaveLength(100);
    expect(new Set(bots.map((bot) => bot.id)).size).toBe(100);
    expect(bots.map((bot) => bot.id)).toEqual(decideCrowd({ seed: 1, day: 1,
      stockId: "NOVA", newsSignal: 0, momentum: 0 }).map((decision) => decision.id));
    expect(bots.every((bot) => wealth(bot) === 1_000_000)).toBe(true);
  });

  it("makes repeatable decisions independent of stock processing order without mutating prior state", () => {
    const bots = createBotPortfolios();
    const previous = structuredClone(bots);
    const context = { seed: 2026, day: 1, news, stocks };
    const planned = planBotDay(bots, context);
    expect(planBotDay(bots, { ...context, stocks: [...stocks].reverse() })).toEqual(planned);
    expect(planBotDay(bots, context)).toEqual(planned);
    expect(bots).toEqual(previous);
    closeBotDay(planned, 1);
    expect(bots).toEqual(previous);
  });

  it("reconciles wealth over three days and respects affordability, savings caps and loan costs", () => {
    const activity = new Set<string>();
    for (const seed of [0, 1, 42, 2026]) {
      let bots = createBotPortfolios();
      for (let day = 1; day <= 3; day++) {
        const context = { seed, day, stocks, news: { ...news, day,
          impact: day === 2 ? -1 : 1, category: day === 2 ? "BAD" as const : "GOOD" as const } };
        const before = bots.map(wealth);
        const planned = planBotDay(bots, context);
        bots = closeBotDay(planned, day);
        bots.forEach((bot, index) => {
          let netIncome = 0;
          const cash = planned[index].cashPence;
          expect(Number.isSafeInteger(cash)).toBe(true);
          expect(cash).toBeGreaterThanOrEqual(0);
          expect(Object.values(bot.holdings).every((quantity) => Number.isSafeInteger(quantity) && quantity >= 0)).toBe(true);
          expect(bot.lastActions.filter((action) => action.type === "ARBITRAGE").length).toBeLessThanOrEqual(3);
          for (const action of bot.lastActions) {
            activity.add(action.type);
            if (action.type === "ARBITRAGE" || action.type === "SAVINGS_INTEREST") netIncome += action.amountPence;
            if (action.type === "LOAN_INTEREST" || action.type === "LOAN_PENALTY") netIncome -= action.amountPence;
            if (action.type === "BORROW") expect(action.amountPence).toBeLessThanOrEqual(1_000_000);
          }
          expect(wealth(bot)).toBe(before[index] + netIncome);
          const deposits = planned[index].lastActions.filter((action) => action.type === "DEPOSIT");
          if (deposits.length > 0) expect(planned[index].savingsPence).toBeLessThanOrEqual(500_000);
        });
      }
    }
    for (const type of ["BUY", "SELL", "DEPOSIT", "WITHDRAW", "BORROW", "REPAY", "ARBITRAGE", "SAVINGS_INTEREST", "LOAN_INTEREST"]) {
      expect(activity.has(type), type).toBe(true);
    }
  });

  it("compounds savings above the deposit cap and charges overdue debt without creating cash", () => {
    const saver = createBotPortfolios().find((bot) => bot.group === "PESSIMIST")!;
    saver.cashPence = 490_000;
    saver.savingsPence = 510_000;
    const poor = createBotPortfolios().find((bot) => bot.group === "FOMO")!;
    poor.cashPence = 0;
    poor.loan = { id: "overdue", principalPence: 100_000, balancePence: 105_000,
      borrowedDay: 1, dueDay: 2, lastAccruedDay: 1 };
    const planned = planBotDay([saver, poor], { seed: 2, day: 2, stocks,
      news: { ...news, day: 2, category: "BAD", impact: -1 } });
    const closed = closeBotDay(planned, 2);
    expect(closed[0].savingsPence).toBe(520_200);
    expect(closed[1]).toMatchObject({ cashPence: 0, lockedThroughDay: 3,
      loan: { balancePence: 110_250, lastAccruedDay: 2 } });
    expect(closed[1].lastActions).toContainEqual({ type: "LOAN_PENALTY", amountPence: 5250 });
    expect(wealth(closed[1])).toBe(-110_250);
  });
});

describe("wealth ranking", () => {
  it("returns exactly ten unique entries, shares tied ranks and preserves the player's rank outside the top ten", () => {
    const bots = createBotPortfolios();
    bots.forEach((bot, index) => { bot.cashPence += index * 100; });
    const board = buildLeaderboard(bots, stocks, player, 1, 0);
    expect(board.totalParticipants).toBe(101);
    expect(board.entries).toHaveLength(10);
    expect(new Set(board.entries.map((entry) => entry.id)).size).toBe(10);
    expect(board.entries.map((entry) => entry.netWorthPence)).toEqual(
      board.entries.map((entry) => entry.netWorthPence).sort((a, b) => b - a));
    expect(board.player.rank).toBe(100);
    expect(board.entries.some((entry) => entry.isPlayer)).toBe(false);
    const tied = buildLeaderboard(createBotPortfolios(), stocks, player, 1, 0);
    expect(tied.player.rank).toBe(1);
    expect(tied.entries.every((entry) => entry.rank === 1)).toBe(true);
    expect(tied.entries[0].isPlayer).toBe(true);
  });

  it("marks shares at current prices and deducts debt so borrowing does not improve rank", () => {
    const bots = createBotPortfolios();
    bots[0].cashPence = 2_000_000;
    bots[0].loan = { id: "loan", principalPence: 1_000_000, balancePence: 1_050_000,
      borrowedDay: 1, dueDay: 2, lastAccruedDay: 1 };
    const heldPlayer = { cashPence: 500_000, savingsPence: 200_000, stockValuePence: 800_000, debtPence: 500_000 };
    const board = buildLeaderboard(bots, stocks, heldPlayer, 1, 1);
    expect(board.player).toMatchObject({ grossAssetsPence: 1_500_000, debtPence: 500_000, netWorthPence: 1_000_000, returnPct: 0 });
    expect(board.entries.some((entry) => entry.id === bots[0].id)).toBe(false);
    bots[0].holdings.NOVA = 10;
    const richer = buildLeaderboard(bots, stocks, heldPlayer, 1, 1).entries.find((entry) => entry.id === bots[0].id)!;
    expect(richer.stockValuePence).toBe(100_000);
    expect(richer.netWorthPence).toBe(1_050_000);
  });
});
