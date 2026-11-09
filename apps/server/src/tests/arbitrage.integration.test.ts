import { randomUUID } from "node:crypto";
import type { ApiResponse, ArbitrageMarketDTO, GameStateDTO } from "@bullish/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";
import { repackOrder } from "./helpers/arbitrage.ts";

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => { server = await startTestServer(); });
afterAll(async () => { await server?.stop(); });

async function request<T>(path: string, token?: string, input?: unknown, key?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (input !== undefined) headers["Content-Type"] = "application/json";
  if (key) headers["Idempotency-Key"] = key;
  const response = await fetch(server.baseUrl + "/api/games" + path, { headers,
    method: input === undefined ? "GET" : "POST", body: input === undefined ? undefined : JSON.stringify(input) });
  return { status: response.status, body: await response.json() as ApiResponse<T> };
}

function success<T>(result: { status: number; body: ApiResponse<T> }, status = 200): T {
  expect(result.status).toBe(status);
  if (!result.body.success) throw new Error(result.body.error.message);
  return result.body.data;
}

async function game() {
  const created = success(await request<GameStateDTO & { accessToken: string }>("", undefined, {}), 201);
  const token = created.accessToken, id = created.gameId;
  let current: GameStateDTO = created;
  await server.prisma.gameSession.update({ where: { id }, data: { seed: 2026 } });
  return { id, token, state: () => current,
    market: async () => success(await request<ArbitrageMarketDTO>(`/${id}/arbitrage`, token)),
    load: async () => success(await request<GameStateDTO>(`/${id}`, token)),
    send: async (action: string, payload: Record<string, unknown> = {}) => {
      const result = await request<GameStateDTO>(`/${id}/${action}`, token, { ...payload, expectedVersion: current.version }, randomUUID());
      if (result.body.success) current = result.body.data;
      return result;
    },
  };
}

describe("three daily arbitrage stalls", () => {
  it("requires the owning token and returns three stable price lists without calculated outcomes", async () => {
    const g = await game(), other = await game();
    expect((await request(`/${g.id}/arbitrage`)).status).toBe(401);
    expect((await request(`/${g.id}/arbitrage`, other.token)).status).toBe(403);
    const market = await g.market();
    expect(market.stalls).toHaveLength(3);
    expect(await g.market()).toEqual(market);
    for (const stall of market.stalls) {
      expect(Object.keys(stall).sort()).toEqual(["completedToday", "items", "puzzleId", "title", "unitName"]);
      expect(stall.items.length).toBeGreaterThanOrEqual(2);
      expect(stall.items.length).toBeLessThanOrEqual(4);
    }
    expect((await g.load()).version).toBe(0);
  });

  it("allows one basket at each stall, sums all three outcomes and refreshes the next day's stalls", async () => {
    const g = await game();
    success(await g.send("open-market"));
    const market = await g.market();
    let profit = 0;
    for (let index = 0; index < 3; index++) {
      const trade = repackOrder(market.stalls[index]);
      const settled = success(await g.send("arbitrage/execute", trade.input));
      profit += trade.profitPence;
      expect(settled.wallet.cashPence).toBe(1_000_000 + profit);
      expect(settled.arbitrage).toMatchObject({ completedCount: index + 1, dailyLimit: 3, completedToday: index === 2 });
      const refreshed = await g.market();
      expect(refreshed.stalls.map((stall) => stall.items)).toEqual(market.stalls.map((stall) => stall.items));
      expect(refreshed.stalls[index].completedToday).toBe(true);
      expect(await g.send("arbitrage/execute", trade.input)).toMatchObject({ status: 409, body: { error: { code: "ARBITRAGE_ALREADY_COMPLETED" } } });
    }
    const attempts = await server.prisma.arbitrageAttempt.findMany({ where: { gameId: g.id } });
    expect(attempts).toHaveLength(3);
    expect(attempts.every((attempt) => attempt.route === "MARKET_BASKET" && Array.isArray(attempt.orders))).toBe(true);
    success(await g.send("prediction", { direction: "NEUTRAL" }));
    const closed = success(await g.send("end-day"));
    expect(closed.reports[0].arbitragePnlPence).toBe(profit);
    expect(closed.netWorthPence).toBe(1_000_000 + profit);
    expect(closed.reports[0]).not.toHaveProperty("leaderboard");
    success(await g.send("next-day"));
    const next = await g.market();
    expect(next.stalls.every((stall) => !stall.completedToday)).toBe(true);
    expect(next.stalls.every((stall) => !market.stalls.some((old) => old.title === stall.title))).toBe(true);
    expect(g.state().arbitrage).toMatchObject({ completedToday: false, completedCount: 0 });
    success(await g.send("open-market"));
    expect(await g.send("arbitrage/execute", repackOrder(market.stalls[0]).input)).toMatchObject({
      status: 422, body: { error: { code: "INVALID_PUZZLE" } },
    });
  });

  it("rejects unmatched units, duplicated items and forged prices without spending an attempt", async () => {
    const g = await game();
    success(await g.send("open-market"));
    const stall = (await g.market()).stalls[0];
    const item = stall.items[0];
    const before = await g.load();
    const base = { puzzleId: stall.puzzleId };
    expect(await g.send("arbitrage/execute", { ...base, orders: [{ itemId: item.id, buyQuantity: 2, sellQuantity: 1 }] }))
      .toMatchObject({ status: 422, body: { error: { code: "UNBALANCED_ORDER" } } });
    expect(await g.send("arbitrage/execute", { ...base, orders: [{ itemId: "missing", buyQuantity: 1, sellQuantity: 1 }] }))
      .toMatchObject({ status: 422, body: { error: { code: "INVALID_ITEM" } } });
    expect(await g.send("arbitrage/execute", { ...base, orders: [
      { itemId: item.id, buyQuantity: 1, sellQuantity: 0 }, { itemId: item.id, buyQuantity: 0, sellQuantity: 1 },
    ] })).toMatchObject({ status: 422, body: { error: { code: "DUPLICATE_ITEM" } } });
    expect(await g.send("arbitrage/execute", { ...base,
      orders: [{ itemId: item.id, buyQuantity: 1, sellQuantity: 1, buyPricePence: 1 }] })).toMatchObject({ status: 400 });
    expect(await g.load()).toEqual(before);
    expect(await server.prisma.arbitrageAttempt.count({ where: { gameId: g.id } })).toBe(0);
  });

  it("replays concurrent identical requests once and rejects a different concurrent order", async () => {
    const g = await game();
    success(await g.send("open-market"));
    const market = await g.market(), trade = repackOrder(market.stalls[0]);
    const input = { ...trade.input, expectedVersion: g.state().version }, key = randomUUID();
    const results = await Promise.all([request<GameStateDTO>(`/${g.id}/arbitrage/execute`, g.token, input, key),
      request<GameStateDTO>(`/${g.id}/arbitrage/execute`, g.token, input, key)]);
    const closed = success(results[0]);
    expect(success(results[1])).toEqual(closed);
    expect(closed.wallet.cashPence).toBe(1_000_000 + trade.profitPence);
    expect(await server.prisma.arbitrageAttempt.count({ where: { gameId: g.id } })).toBe(1);
    const other = { ...repackOrder(market.stalls[1]).input, expectedVersion: closed.version };
    const competing = await Promise.all([request<GameStateDTO>(`/${g.id}/arbitrage/execute`, g.token, other, randomUUID()),
      request<GameStateDTO>(`/${g.id}/arbitrage/execute`, g.token, { ...repackOrder(market.stalls[2]).input, expectedVersion: closed.version }, randomUUID())]);
    expect(competing.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await server.prisma.arbitrageAttempt.count({ where: { gameId: g.id } })).toBe(2);
  });

  it("rolls back cash, version and attempts if saving the order audit fails", async () => {
    const g = await game();
    success(await g.send("open-market"));
    const trade = repackOrder((await g.market()).stalls[0]);
    const before = await g.load();
    await server.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_test_basket() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected basket failure'; END $$`);
    await server.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_test_basket BEFORE INSERT ON "ArbitrageAttempt" FOR EACH ROW EXECUTE FUNCTION reject_test_basket()`);
    try {
      expect((await g.send("arbitrage/execute", trade.input)).status).toBe(500);
      expect(await g.load()).toEqual(before);
      expect(await server.prisma.arbitrageAttempt.count({ where: { gameId: g.id } })).toBe(0);
      expect(await server.prisma.idempotencyRecord.count({ where: { gameId: g.id } })).toBe(0);
    } finally {
      await server.prisma.$executeRawUnsafe(`DROP TRIGGER reject_test_basket ON "ArbitrageAttempt"`);
      await server.prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_basket()`);
    }
    success(await g.send("arbitrage/execute", trade.input));
  });

  it("preserves legacy oil records, counts them towards the daily limit and clears all attempts on reset", async () => {
    const g = await game();
    await server.prisma.arbitrageAttempt.create({ data: { gameId: g.id, day: 1, puzzleId: "OIL-D1",
      route: "BUY_BUNDLE_SELL_UNITS", quantity: 1, costPence: 6900, revenuePence: 7200, profitPence: 300 } });
    success(await g.send("open-market"));
    const market = await g.market();
    success(await g.send("arbitrage/execute", repackOrder(market.stalls[0]).input));
    const final = success(await g.send("arbitrage/execute", repackOrder(market.stalls[1]).input));
    expect(final.arbitrage.completedToday).toBe(true);
    expect(await g.send("arbitrage/execute", repackOrder(market.stalls[2]).input)).toMatchObject({ status: 409 });
    success(await g.send("reset"));
    expect(g.state().arbitrage).toMatchObject({ completedCount: 0, completedToday: false });
    expect(await server.prisma.arbitrageAttempt.count({ where: { gameId: g.id } })).toBe(0);
    expect((await g.market()).stalls.every((stall) => !stall.completedToday)).toBe(true);
  });
});
