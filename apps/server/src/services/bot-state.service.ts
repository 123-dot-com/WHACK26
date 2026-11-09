import type { StockId } from "@bullish/shared";
import { getDailyNews } from "../data/news.ts";
import { closeBotDay, createBotPortfolios, planBotDay, type BotPortfolio, type BotStock } from "../engines/bot.engine.ts";
import type { GameData } from "../repositories/game.repository.ts";

export function botStocksForDay(game: GameData, day: number): BotStock[] {
  return (["NOVA", "GREEN", "FINX"] as StockId[]).map((id) => {
    const price = game.prices.find((item) => item.stockID === id && item.day === day - 1);
    const previous = game.prices.find((item) => item.stockID === id && item.day === Math.max(0, day - 2));
    if (!price || !previous) throw new Error(`Bot price history is missing for ${id} on day ${day}.`);
    return { id, pricePence: price.pricePence, previousPricePence: previous.pricePence };
  });
}

export function restoreBotPortfolios(game: GameData): BotPortfolio[] {
  let bots = createBotPortfolios();
  for (let day = 1; day <= game.lastSimulatedDay; day++) {
    const stored = game.reports.find((report) => report.day === day)?.details as unknown as
      { botPortfolios?: BotPortfolio[] } | undefined;
    // Reports keep the settled portfolios atomically with prices and player wealth.
    // Older games can reconstruct missing bot snapshots from their historical prices.
    bots = stored?.botPortfolios ?? closeBotDay(planBotDay(bots, {
      seed: game.seed, day, news: getDailyNews(game.seed, day), stocks: botStocksForDay(game, day),
    }), day);
  }
  return bots;
}
