import { randomInt } from "node:crypto";
import type { NewsDTO, StockId } from "@bullish/shared";
import { seededRandom } from "../engines/random.ts";

interface NewsTemplate {
  category: NewsDTO["category"];
  headline: string;
  impact: number;
  affectedStockIds: readonly StockId[];
  numberRange?: readonly [number, number];
  numberFormat?: "ordinal";
}

const marketStocks = ["NOVA", "GREEN", "FINX"] as const;

export const newsTemplates: readonly NewsTemplate[] = [
  // Good news
  { category: "GOOD", headline: "Nova AI signs a [number] billion dollar cloud deal", impact: 0.8,
    affectedStockIds: ["NOVA"], numberRange: [1, 20] },
  { category: "GOOD", headline: "GreenGrid Energy wins a national solar contract", impact: 0.5,
    affectedStockIds: ["GREEN"] },
  { category: "GOOD", headline: "FinX Bank reports record quarterly profit", impact: 0.6,
    affectedStockIds: ["FINX"] },
  { category: "GOOD", headline: "Tech sector hiring surges [number] percent", impact: 0.4,
    affectedStockIds: ["NOVA"], numberRange: [5, 25] },
  { category: "GOOD", headline: "Regulators approve the new AI safety framework", impact: 0.5,
    affectedStockIds: ["NOVA"] },
  { category: "GOOD", headline: "Consumer confidence hits a [number] month high", impact: 0.3,
    affectedStockIds: marketStocks, numberRange: [6, 36] },
  // Orion is a sector peer; NOVA is the game's tradable technology stock.
  { category: "GOOD", headline: "Orion Cloud expands into [number] new markets", impact: 0.4,
    affectedStockIds: ["NOVA"], numberRange: [2, 12] },
  { category: "GOOD", headline: "GreenGrid cuts battery costs by [number] percent", impact: 0.6,
    affectedStockIds: ["GREEN"], numberRange: [10, 40] },
  { category: "GOOD", headline: "FinX Bank announces a share buyback program", impact: 0.5,
    affectedStockIds: ["FINX"] },
  { category: "GOOD", headline: "Export orders rise for a [number] straight month", impact: 0.3,
    affectedStockIds: marketStocks, numberRange: [2, 12], numberFormat: "ordinal" },

  // Bad news
  { category: "BAD", headline: "Nova AI cuts its revenue forecast", impact: -0.9,
    affectedStockIds: ["NOVA"] },
  { category: "BAD", headline: "FinX Bank faces a regulatory fine", impact: -0.5,
    affectedStockIds: ["FINX"] },
  { category: "BAD", headline: "GreenGrid Energy delays its turbine rollout", impact: -0.6,
    affectedStockIds: ["GREEN"] },
  { category: "BAD", headline: "Inflation rises to [number] percent", impact: -0.4,
    affectedStockIds: marketStocks, numberRange: [3, 10] },
  { category: "BAD", headline: "A major supplier files for bankruptcy", impact: -0.5,
    affectedStockIds: marketStocks },
  { category: "BAD", headline: "Tech layoffs hit [number] thousand workers", impact: -0.5,
    affectedStockIds: ["NOVA"], numberRange: [5, 50] },
  { category: "BAD", headline: "Interest rates rise by [number] basis points", impact: -0.3,
    affectedStockIds: marketStocks, numberRange: [25, 100] },
  { category: "BAD", headline: "FinX Bank reports a rise in loan defaults", impact: -0.7,
    affectedStockIds: ["FINX"] },
  { category: "BAD", headline: "GreenGrid Energy loses a key government contract", impact: -0.7,
    affectedStockIds: ["GREEN"] },
  { category: "BAD", headline: "A cyberattack disrupts [number] trading platforms", impact: -0.6,
    affectedStockIds: marketStocks, numberRange: [2, 8] },

  // Neutral news includes the requested small positive and negative impacts.
  { category: "NEUTRAL", headline: "Nova AI appoints a new chief financial officer", impact: 0.05,
    affectedStockIds: ["NOVA"] },
  { category: "NEUTRAL", headline: "GreenGrid Energy schedules its annual shareholder meeting", impact: 0,
    affectedStockIds: ["GREEN"] },
  { category: "NEUTRAL", headline: "FinX Bank publishes its quarterly report next week", impact: 0,
    affectedStockIds: ["FINX"] },
  { category: "NEUTRAL", headline: "Trading volumes stay flat for a [number] day", impact: 0,
    affectedStockIds: marketStocks, numberRange: [2, 7], numberFormat: "ordinal" },
  { category: "NEUTRAL", headline: "Analysts keep their ratings unchanged", impact: 0,
    affectedStockIds: marketStocks },
  { category: "NEUTRAL", headline: "The market opens flat this morning", impact: 0,
    affectedStockIds: marketStocks },
  { category: "NEUTRAL", headline: "Nova AI confirms its product launch date", impact: 0.1,
    affectedStockIds: ["NOVA"] },
  { category: "NEUTRAL", headline: "GreenGrid Energy completes a routine maintenance cycle", impact: 0,
    affectedStockIds: ["GREEN"] },
  { category: "NEUTRAL", headline: "FinX Bank renews its office lease in the city", impact: -0.05,
    affectedStockIds: ["FINX"] },
  { category: "NEUTRAL", headline: "A major index rebalances its holdings", impact: 0,
    affectedStockIds: marketStocks },
];

export function getNewsSchedule(seed: number): readonly NewsTemplate[] {
  // Shuffle once per seed so each game has three distinct, repeatable headlines.
  const schedule = [...newsTemplates];
  const random = seededRandom(seed, 0, "MARKET", "newsSelection");
  for (let i = schedule.length - 1; i > 0; i--) {
    const index = Math.floor(random() * (i + 1));
    [schedule[i], schedule[index]] = [schedule[index], schedule[i]];
  }
  return schedule.slice(0, 3);
}

export function getDailyNews(seed: number, day: number): NewsDTO {
  if (!Number.isInteger(day) || day < 1 || day > 3) {
    throw new RangeError("News is only available for game days 1 to 3.");
  }

  const template = getNewsSchedule(seed)[day - 1];
  return renderNews(template, seed, day);
}

type PublishedNews = {
  templateHeadline: string;
  news: { [Field in keyof NewsDTO]: NewsDTO[Field] };
};

interface NewsSession {
  seed: number;
  day: number;
  dailyNews: unknown;
  newsHistory: readonly string[];
}

export function getPublishedNews(game: Pick<NewsSession, "seed" | "dailyNews">, day: number): NewsDTO {
  const publications = game.dailyNews as Record<string, PublishedNews>;
  // Keep existing days consistent with predictions and reports in older sessions.
  return publications[String(day)]?.news ?? getDailyNews(game.seed, day);
}

export function prepareDailyNews(game: NewsSession, day: number,
  options: { seed?: number; reset?: boolean } = {}) {
  if (!Number.isInteger(day) || day < 1 || day > 3) {
    throw new RangeError("News is only available for game days 1 to 3.");
  }

  const publications = { ...game.dailyNews as Record<string, PublishedNews> };
  let history = [...game.newsHistory];
  if (game.day > 0 && Object.keys(publications).length === 0 && history.length === 0) {
    // Old sessions may have replayed this seeded trio before news history existed.
    history = getNewsSchedule(game.seed).map((template) => template.headline);
  }
  for (let previousDay = 1; previousDay <= game.day; previousDay++) {
    const publication = publications[String(previousDay)] ?? {
      templateHeadline: getNewsSchedule(game.seed)[previousDay - 1].headline,
      news: getDailyNews(game.seed, previousDay),
    };
    publications[String(previousDay)] = publication;
    if (!history.includes(publication.templateHeadline)) history.push(publication.templateHeadline);
  }
  if (!options.reset && publications[String(day)]) {
    return { dailyNews: publications, newsHistory: history };
  }

  let available = newsTemplates.filter((template) => !history.includes(template.headline));
  if (available.length === 0) {
    // Refill the pool after all 30 templates, keeping the last three out of the next draw.
    history = history.slice(-3);
    available = newsTemplates.filter((template) => !history.includes(template.headline));
  }
  const template = available[randomInt(available.length)];
  return {
    dailyNews: {
      ...(options.reset ? {} : publications),
      [day]: { templateHeadline: template.headline, news: renderNews(template, options.seed ?? game.seed, day) },
    },
    newsHistory: [...history, template.headline],
  };
}

function renderNews(template: NewsTemplate, seed: number, day: number): NewsDTO {
  let headline = template.headline;
  if (template.numberRange) {
    const [minimum, maximum] = template.numberRange;
    const numberRandom = seededRandom(seed, day, "MARKET", "newsNumber");
    const value = minimum + Math.floor(numberRandom() * (maximum - minimum + 1));
    let formatted = String(value);
    if (template.numberFormat === "ordinal") {
      const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th"
        : ["th", "st", "nd", "rd"][value % 10] ?? "th";
      formatted += suffix;
    }
    if (/^(8|11|18)(?:\D|$)/.test(formatted)) headline = headline.replace("a [number]", "an [number]");
    headline = headline.replace("[number]", formatted);
  }
  const affectedStockIds = [...template.affectedStockIds];
  const focusRandom = seededRandom(seed, day, "MARKET", "newsFocus");
  return {
    day,
    category: template.category,
    focusStockId: affectedStockIds[Math.floor(focusRandom() * affectedStockIds.length)],
    affectedStockIds,
    headline,
    impact: template.impact,
  };
}
