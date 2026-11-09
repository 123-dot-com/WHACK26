import { describe, expect, it } from "vitest";
import { getDailyNews, getNewsSchedule, getPublishedNews, newsTemplates, prepareDailyNews } from "../data/news.ts";

describe("daily news", () => {
  it("includes ten headlines in each requested category", () => {
    expect(newsTemplates).toHaveLength(30);
    expect(new Set(newsTemplates.map((item) => item.headline)).size).toBe(30);
    for (const category of ["GOOD", "BAD", "NEUTRAL"]) {
      expect(newsTemplates.filter((item) => item.category === category)).toHaveLength(10);
    }
  });

  it("keeps the schedule, focus and numbers stable regardless of read order", () => {
    const original = [1, 2, 3].map((day) => getDailyNews(2026, day));
    getDailyNews(42, 1);
    expect([3, 1, 2].map((day) => getDailyNews(2026, day)))
      .toEqual([original[2], original[0], original[1]]);
    expect([1, 2, 3].map((day) => getDailyNews(42, day))).not.toEqual(original);
  });

  it("can select every template, fills numbers in range, and avoids repeats in a game", () => {
    const seen = new Set<string>();
    const patterns = newsTemplates.map((template) => new RegExp("^" + template.headline
      .replace("a [number]", "an? [number]")
      .replace("[number]", "(\\d+)(?:st|nd|rd|th)?") + "$"));

    for (let seed = 0; seed < 300; seed++) {
      const selected = new Set<string>();
      for (let day = 1; day <= 3; day++) {
        const news = getDailyNews(seed, day);
        const index = patterns.findIndex((pattern) => pattern.test(news.headline));
        expect(index).toBeGreaterThanOrEqual(0);
        const template = newsTemplates[index];
        seen.add(template.headline);
        selected.add(template.headline);
        expect(news.day).toBe(day);
        expect(news.category).toBe(template.category);
        expect(news.impact).toBe(template.impact);
        expect(news.affectedStockIds).toEqual(template.affectedStockIds);
        expect(news.affectedStockIds).toContain(news.focusStockId);
        expect(news.headline).not.toContain("[number]");
        if (template.numberRange) {
          const value = Number(news.headline.match(patterns[index])![1]);
          expect(value).toBeGreaterThanOrEqual(template.numberRange[0]);
          expect(value).toBeLessThanOrEqual(template.numberRange[1]);
          if (template.numberFormat === "ordinal") expect(news.headline).toMatch(/\d+(st|nd|rd|th)\b/);
        }
      }
      expect(selected.size).toBe(3);
    }
    expect(seen.size).toBe(30);
  });

  it.each([0, 4, -1, 1.5, NaN])("rejects unsupported day %s", (day) => {
    expect(() => getDailyNews(2026, day)).toThrow(RangeError);
  });

  it("draws all 30 templates before reusing any, even with an unchanged session seed", () => {
    let session = { seed: 2026, day: 0, dailyNews: {}, newsHistory: [] as string[] };
    const seen = new Set<string>();
    for (let draw = 0; draw < 30; draw++) {
      const day = draw % 3 + 1;
      const next = prepareDailyNews(session, day, { reset: day === 1 });
      const publication = next.dailyNews[String(day)];
      expect(seen.has(publication.templateHeadline)).toBe(false);
      seen.add(publication.templateHeadline);
      session = { ...session, ...next, day };
      expect(getPublishedNews(session, day)).toEqual(publication.news);
      expect(Object.keys(next.dailyNews)).toHaveLength(day);
      expect(prepareDailyNews(session, day)).toEqual(next);
    }
    expect(seen.size).toBe(30);
    const nextCycle = prepareDailyNews(session, 1, { reset: true });
    expect(session.newsHistory.slice(-3)).not.toContain(nextCycle.dailyNews["1"].templateHeadline);
    expect(nextCycle.newsHistory).toHaveLength(4);
  });

  it("moves an existing seeded session beyond its old trio without changing today's news", () => {
    const session = { seed: 2026, day: 1, dailyNews: {}, newsHistory: [] };
    const oldTemplates = getNewsSchedule(session.seed).map((template) => template.headline);
    const next = prepareDailyNews(session, 2);
    expect(getPublishedNews({ ...session, ...next }, 1)).toEqual(getDailyNews(session.seed, 1));
    expect(oldTemplates).not.toContain(next.dailyNews["2"].templateHeadline);
    expect(next.newsHistory).toEqual([...oldTemplates, next.dailyNews["2"].templateHeadline]);
  });
});
