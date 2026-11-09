import { randomUUID } from "node:crypto";
import type { ApiResponse, GameStateDTO, NewsDTO } from "@bullish/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";
import { simulateCrowd } from "../engines/crowd.engine.ts";
import { getDailyNews, getNewsSchedule, getPublishedNews, newsTemplates } from "../data/news.ts";
import { fetchArbitrageTrade } from "./helpers/arbitrage.ts";

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => { server = await startTestServer(); });
afterAll(async () => { await server?.stop(); });

async function request(path: string, body?: unknown, token?: string, key?: string, method = body === undefined ? "GET" : "POST") {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers["Idempotency-Key"] = key;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(server.baseUrl + "/api/games" + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as ApiResponse<GameStateDTO & { accessToken?: string }> };
}

function state(result: Awaited<ReturnType<typeof request>>, status = 200) {
  expect(result.status).toBe(status);
  if (!result.body.success) throw new Error(JSON.stringify(result.body.error));
  return result.body.data;
}

async function game(open = true) {
  const initial = state(await request("", {}), 201);
  const token = initial.accessToken!;
  const id = initial.gameId;
  let current = open ? state(await request(`/${id}/open-market`, { expectedVersion: 0 }, token)) : initial;
  const send = async (action: string, payload: Record<string, unknown> = {}, key = randomUUID()) => {
    const result = await request(`/${id}/${action}`, { ...payload, expectedVersion: current.version }, token, key);
    if (result.body.success) current = result.body.data;
    return result;
  };
  return { id, token, send, current: () => current,
    load: async () => state(await request(`/${id}`, undefined, token)) };
}

async function getNews(id: string, token: string) {
  const response = await fetch(`${server.baseUrl}/api/games/${id}/news`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
  const body = await response.json() as ApiResponse<NewsDTO>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}
const buy = { stockId: "NOVA", side: "BUY", quantity: 20 };

describe("news across briefing, predictions and settlement", () => {
  it.each([
    { seed: 0, affectedStockIds: ["NOVA", "GREEN", "FINX"], category: "BAD" },
    { seed: 1, affectedStockIds: ["NOVA"], category: "GOOD" },
    { seed: 2, affectedStockIds: ["GREEN"], category: "BAD" },
    { seed: 3, affectedStockIds: ["FINX"], category: "BAD" },
    { seed: 5, affectedStockIds: ["NOVA", "GREEN", "FINX"], category: "GOOD" },
    { seed: 9, affectedStockIds: ["NOVA", "GREEN", "FINX"], category: "NEUTRAL" },
  ])("applies the published news to the correct stocks: %j", async ({ seed, affectedStockIds, category }) => {
    const g = await game(false);
    await server.prisma.gameSession.update({ where: { id: g.id }, data: { seed, dailyNews: {}, newsHistory: [] } });
    const news = await getNews(g.id, g.token);
    expect(news).toMatchObject({ affectedStockIds, category });
    const predicted = state(await g.send("prediction", { direction: "NEUTRAL" }));
    expect(predicted.prediction?.stockId).toBe(news.focusStockId);
    state(await g.send("open-market"));
    expect(await getNews(g.id, g.token)).toEqual(news);
    const closed = state(await g.send("end-day"));
    const report = closed.reports[0];
    expect(report.prediction.stockId).toBe(news.focusStockId);
    for (const result of report.marketResults) {
      const crowd = simulateCrowd({ seed, day: 1, stockId: result.stockId, momentum: 0,
        newsSignal: news.affectedStockIds.includes(result.stockId) ? news.impact : 0 });
      expect(result.byGroup).toEqual(crowd.byGroup);
    }
    expect(await getNews(g.id, g.token)).toEqual(news);
    state(await g.send("reset"));
    const restartedNews = await getNews(g.id, g.token);
    expect(restartedNews.headline).not.toBe(news.headline);
    expect(await getNews(g.id, g.token)).toEqual(restartedNews);
  });

  it("publishes new day-one news once for concurrent retries of Restart", async () => {
    const g = await game(false);
    const oldSeed = 2026;
    await server.prisma.gameSession.update({ where: { id: g.id }, data: { seed: oldSeed, dailyNews: {}, newsHistory: [] } });
    const previousHeadline = getDailyNews(oldSeed, 1).headline;
    const input = { expectedVersion: g.current().version }, key = randomUUID();
    const responses = await Promise.all([
      request(`/${g.id}/reset`, input, g.token, key),
      request(`/${g.id}/reset`, input, g.token, key),
    ]);
    const restarted = state(responses[0]);
    expect(state(responses[1])).toEqual(restarted);
    expect(restarted.version).toBe(input.expectedVersion + 1);
    const stored = await server.prisma.gameSession.findUniqueOrThrow({ where: { id: g.id } });
    expect(stored.seed).not.toBe(oldSeed);
    const news = await getNews(g.id, g.token);
    expect(news.headline).not.toBe(previousHeadline);
    expect(news).toEqual(getPublishedNews(stored, 1));
    expect(state(await request(`/${g.id}/reset`, input, g.token, key))).toEqual(restarted);
    expect(await g.load()).toEqual(restarted);
    expect(await getNews(g.id, g.token)).toEqual(news);
    expect((await server.prisma.gameSession.findUniqueOrThrow({ where: { id: g.id } })).seed).toBe(stored.seed);
  });

  it("draws and persists new news when the same session advances a day, including legacy seeds", async () => {
    const g = await game(false);
    const seed = 2026;
    // Leave only this template unused to make the next day's random draw verifiable.
    const nextTemplate = newsTemplates.find((template) => template.category === "GOOD"
      && !template.numberRange && !getNewsSchedule(seed).includes(template))!;
    await server.prisma.gameSession.update({ where: { id: g.id }, data: {
      seed, dailyNews: {}, newsHistory: newsTemplates.filter((template) => template !== nextTemplate).map((template) => template.headline),
    } });
    const firstDay = await getNews(g.id, g.token);
    const initialPrices = g.current().stocks;
    expect(firstDay).toEqual(getDailyNews(seed, 1));
    state(await g.send("prediction", { direction: "NEUTRAL" }));
    state(await g.send("open-market"));
    state(await g.send("end-day"));
    const input = { expectedVersion: g.current().version }, key = randomUUID();
    const responses = await Promise.all([
      request(`/${g.id}/next-day`, input, g.token, key),
      request(`/${g.id}/next-day`, input, g.token, key),
    ]);
    const secondDayState = state(responses[0]);
    expect(state(responses[1])).toEqual(secondDayState);
    expect(secondDayState).toMatchObject({ gameId: g.id, day: 2, phase: "BRIEFING" });
    const secondDay = await getNews(g.id, g.token);
    expect(secondDay).toMatchObject({ day: 2, category: nextTemplate.category, impact: nextTemplate.impact,
      affectedStockIds: [...nextTemplate.affectedStockIds] });
    expect(secondDay.headline).toBe(nextTemplate.headline);
    expect(secondDay.headline).not.toBe(getDailyNews(seed, 2).headline);
    const stored = await server.prisma.gameSession.findUniqueOrThrow({ where: { id: g.id } });
    expect(stored.seed).toBe(seed);
    expect(Object.keys(stored.dailyNews as object).sort()).toEqual(["1", "2"]);
    expect(getPublishedNews(stored, 1)).toEqual(firstDay);
    expect(getPublishedNews(stored, 2)).toEqual(secondDay);
    expect(stored.newsHistory).toHaveLength(30);
    expect(await getNews(g.id, g.token)).toEqual(secondDay);
    expect(state(await request(`/${g.id}/next-day`, input, g.token, key))).toEqual(secondDayState);
    expect(await getNews(g.id, g.token)).toEqual(secondDay);
    const predicted = state(await request(`/${g.id}/prediction`, {
      direction: "BULLISH", expectedVersion: secondDayState.version,
    }, g.token));
    expect(predicted.prediction?.stockId).toBe(secondDay.focusStockId);
    const opened = state(await request(`/${g.id}/open-market`, { expectedVersion: predicted.version }, g.token));
    const closed = state(await request(`/${g.id}/end-day`, { expectedVersion: opened.version }, g.token, randomUUID()));
    for (const result of closed.reports[1].marketResults) {
      const crowd = simulateCrowd({ seed, day: 2, stockId: result.stockId,
        momentum: Math.max(-1, Math.min(1, (result.previousPricePence / initialPrices.find((stock) => stock.id === result.stockId)!.pricePence - 1) / .1)),
        newsSignal: secondDay.affectedStockIds.includes(result.stockId) ? secondDay.impact : 0 });
      expect(result.byGroup).toEqual(crowd.byGroup);
    }
    expect(await getNews(g.id, g.token)).toEqual(secondDay);
  });
});

describe("financial APIs with real PostgreSQL", () => {
  it("buys, persists, sells, and writes the authoritative trade audit", async () => {
    const g = await game();
    const bought = state(await g.send("trades", buy));
    expect(bought.wallet.cashPence).toBe(800_000);
    expect(bought.stocks.find((s) => s.id === "NOVA")?.quantityHeld).toBe(20);
    expect(bought.netWorthPence).toBe(1_000_000);
    expect(await g.load()).toEqual(bought);
    const sold = state(await g.send("trades", { ...buy, side: "SELL", quantity: 5 }));
    expect(sold.wallet.cashPence).toBe(850_000);
    const rows = await server.prisma.trade.findMany({ where: { gameId: g.id } });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.side === "BUY")).toMatchObject({ pricePence: 10_000, totalPence: 200_000 });
  });
  it.each([
    [{ ...buy, quantity: 101 }, 422, "INSUFFICIENT_CASH"],
    [{ ...buy, side: "SELL", quantity: 1 }, 422, "INSUFFICIENT_HOLDINGS"],
    [{ ...buy, quantity: 0 }, 400, "INVALID_QUANTITY"],
    [{ ...buy, quantity: -1 }, 400, "INVALID_QUANTITY"],
    [{ ...buy, quantity: 1.5 }, 400, "INVALID_QUANTITY"],
    [{ ...buy, stockId: "UNKNOWN" }, 400, "INVALID_STOCK"],
    [{ ...buy, pricePence: 1 }, 400, "INVALID_REQUEST"],
    [{ ...buy, quantity: 2_147_483_647 }, 422, "AMOUNT_OUT_OF_RANGE"],
  ])("rejects invalid trades without changing state: %j", async (payload, status, code) => {
    const g = await game();
    const before = await g.load();
    expect(await g.send("trades", payload)).toMatchObject({ status, body: { success: false, error: { code } } });
    expect(await g.load()).toEqual(before);
    expect(await server.prisma.trade.count({ where: { gameId: g.id } })).toBe(0);
  });
  it.each(["BRIEFING", "REPORT", "FINISHED"] as const)("blocks financial actions during %s", async (phase) => {
    const g = await game(false);
    await server.prisma.gameSession.update({ where: { id: g.id }, data: { phase } });
    for (const [action, payload] of [
      ["trades", buy], ["bank/deposit", { amountPence: 100 }],
      ["arbitrage/execute", { puzzleId: "not-a-stall", orders: [{ itemId: "pack-1", buyQuantity: 1, sellQuantity: 1 }] }],
    ] as const) {
      expect(await g.send(action, payload)).toMatchObject({ status: 409, body: { error: { code: "INVALID_PHASE" } } });
    }
  });
  it("requires the owning token, an idempotency key and a current version", async () => {
    const g = await game();
    const other = await game();
    const payload = { ...buy, expectedVersion: g.current().version };
    expect((await request(`/${g.id}/trades`, payload)).status).toBe(401);
    expect((await request(`/${g.id}/trades`, payload, other.token, randomUUID())).status).toBe(403);
    expect((await request(`/${g.id}/trades`, payload, g.token)).status).toBe(400);
    state(await g.send("trades", buy));
    expect(await request(`/${g.id}/trades`, payload, g.token, randomUUID()))
      .toMatchObject({ status: 409, body: { error: { code: "VERSION_CONFLICT" } } });
  });
  it("replays identical concurrent requests and rejects reuse for a different action", async () => {
    const g = await game();
    const key = randomUUID();
    const payload = { ...buy, expectedVersion: g.current().version };
    const [a, b] = await Promise.all([request(`/${g.id}/trades`, payload, g.token, key), request(`/${g.id}/trades`, payload, g.token, key)]);
    expect(a.status).toBe(200);
    expect(b).toEqual(a);
    expect(await server.prisma.trade.count({ where: { gameId: g.id } })).toBe(1);
    expect(await request(`/${g.id}/trades`, { ...payload, quantity: 1 }, g.token, key))
      .toMatchObject({ status: 409, body: { error: { code: "IDEMPOTENCY_CONFLICT" } } });
    expect(await request(`/${g.id}/bank/deposit`, { amountPence: 1, expectedVersion: payload.expectedVersion }, g.token, key))
      .toMatchObject({ status: 409, body: { error: { code: "IDEMPOTENCY_CONFLICT" } } });
    const recorded = await server.prisma.idempotencyRecord.findUniqueOrThrow({ where: { gameId_key: { gameId: g.id, key } } });
    expect(recorded.responseBody).toEqual(a.body);
    expect(recorded.statusCode).toBe(200);
  });
  it("allows only one concurrent spend using the same version", async () => {
    const g = await game();
    const payload = { ...buy, expectedVersion: g.current().version };
    const results = await Promise.all([request(`/${g.id}/trades`, payload, g.token, randomUUID()), request(`/${g.id}/trades`, payload, g.token, randomUUID())]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await g.load()).wallet.cashPence).toBe(800_000);
  });
  it("conserves wealth across deposits and withdrawals, rejecting overdrafts", async () => {
    const g = await game();
    expect(state(await g.send("bank/deposit", { amountPence: 200_000 })).netWorthPence).toBe(1_000_000);
    const withdrawn = state(await g.send("bank/withdraw", { amountPence: 50_000 }));
    expect(withdrawn.wallet).toMatchObject({ cashPence: 850_000, savingsPence: 150_000 });
    expect(await g.send("bank/withdraw", { amountPence: 150_001 })).toMatchObject({ status: 422, body: { error: { code: "INSUFFICIENT_SAVINGS" } } });
    expect(await g.load()).toEqual(withdrawn);
  });
  it("settles each arbitrage stall once and enforces full purchase cost", async () => {
    const g = await game();
    const trade = await fetchArbitrageTrade(server.baseUrl, g.id, g.token);
    const payload = trade.input;
    const result = state(await g.send("arbitrage/execute", payload));
    expect(result.wallet.cashPence).toBe(1_000_000 + trade.profitPence);
    expect(result.arbitrage).toMatchObject({ completedToday: false, completedCount: 1, dailyLimit: 3 });
    expect(await g.send("arbitrage/execute", payload)).toMatchObject({ status: 409, body: { error: { code: "ARBITRAGE_ALREADY_COMPLETED" } } });
    const poor = await game();
    state(await poor.send("trades", { ...buy, quantity: 99 }));
    state(await poor.send("trades", { stockId: "GREEN", side: "BUY", quantity: 1 }));
    const poorTrade = await fetchArbitrageTrade(server.baseUrl, poor.id, poor.token, 1000);
    expect(await poor.send("arbitrage/execute", poorTrade.input)).toMatchObject({ status: 422, body: { error: { code: "INSUFFICIENT_CASH" } } });
  });
  it("rolls back cash, holdings, version and the request record when a trade write fails", async () => {
    const g = await game();
    await server.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_test_trade() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected trade failure'; END $$`);
    await server.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_test_trade BEFORE INSERT ON "Trade" FOR EACH ROW EXECUTE FUNCTION reject_test_trade()`);
    try {
      const before = await g.load();
      expect((await g.send("trades", buy)).status).toBe(500);
      expect(await g.load()).toEqual(before);
      expect(await server.prisma.idempotencyRecord.count({ where: { gameId: g.id } })).toBe(0);
    } finally {
      await server.prisma.$executeRawUnsafe(`DROP TRIGGER reject_test_trade ON "Trade"`);
      await server.prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_trade()`);
    }
  });
});

describe("three-day progression and reports", () => {
  it("persists monthly terms, rejects over-limit deposits and compounds above the cap", async () => {
    const g = await game();
    expect(g.current().wallet).toMatchObject({ monthlyInterestBps: 200, savingsDepositLimitPence: 500_000 });
    expect(g.current().wallet).not.toHaveProperty("annualInterestBps");
    state(await g.send("bank/deposit", { amountPence: 500_000 }));
    const full = await g.load();
    expect(await g.send("bank/deposit", { amountPence: 1 })).toMatchObject({ status: 422, body: { error: { code: "SAVINGS_LIMIT_EXCEEDED" } } });
    expect(await g.load()).toEqual(full);
    state(await g.send("prediction", { direction: "BULLISH" }));
    const closed = state(await g.send("end-day"));
    expect(closed.wallet.savingsPence).toBe(510_000);
    expect(closed.reports[0].interestPence).toBe(10_000);
    state(await g.send("next-day")); state(await g.send("open-market"));
    expect(await g.send("bank/deposit", { amountPence: 1 })).toMatchObject({ status: 422 });
    state(await g.send("prediction", { direction: "BULLISH" }));
    const compounded = state(await g.send("end-day"));
    expect(compounded.wallet.savingsPence).toBe(520_200);
    expect(compounded.reports[1].interestPence).toBe(10_200);
    state(await g.send("reset"));
    expect(g.current().wallet).toMatchObject({ monthlyInterestBps: 200, savingsDepositLimitPence: 500_000, savingsPence: 0 });
  });
  it("serializes competing deposits at the cap without exceeding the limit", async () => {
    const g = await game();
    state(await g.send("bank/deposit", { amountPence: 400_000 }));
    const payload = { amountPence: 100_000, expectedVersion: g.current().version };
    const results = await Promise.all([request(`/${g.id}/bank/deposit`, payload, g.token, randomUUID()), request(`/${g.id}/bank/deposit`, payload, g.token, randomUUID())]);
    expect(results.map((item) => item.status).sort()).toEqual([200, 409]);
    const loaded = await g.load();
    expect(loaded.wallet.savingsPence).toBe(500_000);
    expect(await request(`/${g.id}/bank/deposit`, { amountPence: 1, expectedVersion: loaded.version }, g.token, randomUUID()))
      .toMatchObject({ status: 422, body: { error: { code: "SAVINGS_LIMIT_EXCEEDED" } } });
  });
  it("rolls back prices, interest and phase when report persistence fails", async () => {
    const g = await game();
    state(await g.send("bank/deposit", { amountPence: 200_000 }));
    state(await g.send("prediction", { direction: "BULLISH" }));
    await server.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_test_report() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected report failure'; END $$`);
    await server.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_test_report BEFORE INSERT ON "DailyReport" FOR EACH ROW EXECUTE FUNCTION reject_test_report()`);
    try {
      const before = await g.load();
      expect((await g.send("end-day")).status).toBe(500);
      expect(await g.load()).toEqual(before);
      expect(await server.prisma.stockPrice.count({ where: { gameID: g.id, day: 1 } })).toBe(0);
      expect(await server.prisma.bankTransaction.count({ where: { gameId: g.id, operation: "INTEREST" } })).toBe(0);
    } finally {
      await server.prisma.$executeRawUnsafe(`DROP TRIGGER reject_test_report ON "DailyReport"`);
      await server.prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_report()`);
    }
    expect(state(await g.send("end-day")).phase).toBe("REPORT");
  });
  it("enforces database constraints independently of application validation", async () => {
    const g = await game();
    await expect(server.prisma.wallet.update({ where: { gameId: g.id }, data: { cashPence: -1 } })).rejects.toThrow();
    await expect(server.prisma.holding.update({ where: { gameID_stockID: { gameID: g.id, stockID: "NOVA" } }, data: { quantity: -1 } })).rejects.toThrow();
    await server.prisma.bankTransaction.create({ data: { gameId: g.id, day: 1, operation: "INTEREST", amountPence: 0 } });
    await expect(server.prisma.bankTransaction.create({ data: { gameId: g.id, day: 1, operation: "INTEREST", amountPence: 1 } })).rejects.toThrow();
  });
  it("requires a prediction, credits interest once and reconciles actual market P&L", async () => {
    const g = await game();
    expect(await g.send("end-day")).toMatchObject({ status: 422, body: { error: { code: "PREDICTION_REQUIRED" } } });
    state(await g.send("trades", buy));
    state(await g.send("bank/deposit", { amountPence: 200_000 }));
    const trade = await fetchArbitrageTrade(server.baseUrl, g.id, g.token);
    state(await g.send("arbitrage/execute", trade.input));
    state(await g.send("prediction", { direction: "BULLISH" }));
    const key = randomUUID();
    const payload = { expectedVersion: g.current().version };
    const result = await request(`/${g.id}/end-day`, payload, g.token, key);
    const closed = state(result);
    const report = closed.reports[0];
    expect(closed.phase).toBe("REPORT");
    expect(report.interestPence).toBe(4000);
    expect(report.arbitragePnlPence).toBe(trade.profitPence);
    expect(closed.wallet.savingsPence).toBe(204_000);
    expect(closed.netWorthPence).toBe(1_000_000 + report.marketPnlPence + 4000 + trade.profitPence);
    expect(report.netWorthPence).toBe(closed.netWorthPence);
    expect(report.marketPnlPence).toBe(20 * (report.marketResults.find((r) => r.stockId === "NOVA")!.nextPricePence - 10_000));
    expect(await request(`/${g.id}/end-day`, payload, g.token, key)).toEqual(result);
    expect(await server.prisma.bankTransaction.count({ where: { gameId: g.id, operation: "INTEREST" } })).toBe(1);
    const historical = await request(`/${g.id}/reports/1`, undefined, g.token);
    expect(historical.body.success && historical.body.data).toEqual(report);
  });
  it("commits only one of two concurrent End Day requests", async () => {
    const g = await game();
    state(await g.send("prediction", { direction: "BULLISH" }));
    const payload = { expectedVersion: g.current().version };
    const results = await Promise.all([request(`/${g.id}/end-day`, payload, g.token, randomUUID()), request(`/${g.id}/end-day`, payload, g.token, randomUUID())]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await server.prisma.dailyReport.count({ where: { gameId: g.id } })).toBe(1);
    expect(await server.prisma.stockPrice.count({ where: { gameID: g.id, day: 1 } })).toBe(3);
  });
  it("finishes after three days, persists reports, and starts a fresh scenario on reset", async () => {
    const g = await game();
    const previousHeadlines: string[] = [];
    for (let day = 1; day <= 3; day++) {
      previousHeadlines.push((await getNews(g.id, g.token)).headline);
      expect(g.current().prediction).toBeNull();
      state(await g.send("prediction", { direction: day === 3 ? "BEARISH" : "BULLISH" }));
      const closed = state(await g.send("end-day"));
      expect(closed.phase).toBe(day === 3 ? "FINISHED" : "REPORT");
      expect(closed.reports).toHaveLength(day);
      if (day < 3) {
        state(await g.send("next-day"));
        state(await g.send("open-market"));
      }
    }
    const finished = await g.load();
    expect(finished.reports.every((report) => report.marketResults.length === 3)).toBe(true);
    expect(await g.send("next-day")).toMatchObject({ status: 409 });
    const resetState = state(await g.send("reset"));
    expect(resetState).toMatchObject({ day: 1, phase: "BRIEFING", prediction: null, netWorthPence: 1_000_000, reports: [] });
    expect(resetState.version).toBeGreaterThan(finished.version);
    expect(resetState.stocks.every((s) => s.quantityHeld === 0)).toBe(true);
    for (let day = 1; day <= 3; day++) {
      const news = await getNews(g.id, g.token);
      expect(previousHeadlines).not.toContain(news.headline);
      state(await g.send("open-market"));
      state(await g.send("prediction", { direction: "BULLISH" }));
      const closed = state(await g.send("end-day"));
      expect(closed.reports[day - 1].prediction.stockId).toBe(news.focusStockId);
      expect(await g.load()).toEqual(closed);
      if (day < 3) state(await g.send("next-day"));
    }
    expect(g.current().phase).toBe("FINISHED");
  });
});
