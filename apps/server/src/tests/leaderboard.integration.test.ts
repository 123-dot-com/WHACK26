import { randomUUID } from "node:crypto";
import type { ApiResponse, GameStateDTO, LeaderboardDTO } from "@bullish/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";
import { fetchArbitrageTrade } from "./helpers/arbitrage.ts";

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
  return { id, token, state: () => current,
    board: async () => success(await request<LeaderboardDTO>(`/${id}/leaderboard`, token)),
    locked: async () => expect(await request<LeaderboardDTO>(`/${id}/leaderboard`, token))
      .toMatchObject({ status: 409, body: { success: false, error: { code: "LEADERBOARD_LOCKED" } } }),
    load: async () => success(await request<GameStateDTO>(`/${id}`, token)),
    send: async (action: string, payload: Record<string, unknown> = {}) => {
      current = success(await request<GameStateDTO>(`/${id}/${action}`, token,
        { ...payload, expectedVersion: current.version }, randomUUID()));
      return current;
    },
  };
}

async function finish(g: Awaited<ReturnType<typeof game>>) {
  while (g.state().phase !== "FINISHED") {
    if (g.state().phase === "REPORT") await g.send("next-day");
    if (g.state().phase === "BRIEFING") await g.send("open-market");
    await g.send("prediction", { direction: "NEUTRAL" });
    await g.send("end-day");
  }
}

describe("final wealth leaderboard over HTTP and PostgreSQL", () => {
  it("requires the owning token and keeps rankings locked in a new game", async () => {
    const g = await game(), other = await game();
    expect((await request(`/${g.id}/leaderboard`)).status).toBe(401);
    expect((await request(`/${g.id}/leaderboard`, other.token)).status).toBe(403);
    await g.locked();
    expect((await g.load()).version).toBe(0);
  });

  it("hides rankings in briefing, trading and early reports, then reveals only the day-three final ranking", async () => {
    const g = await game();
    for (let day = 1; day <= 3; day++) {
      await g.locked();
      await g.send("open-market");
      await g.locked();
      await g.send("prediction", { direction: "BULLISH" });
      await g.send("end-day");
      const report = g.state().reports[day - 1];
      expect(report).not.toHaveProperty("botPortfolios");
      const stored = await server.prisma.dailyReport.findUniqueOrThrow({ where: { gameId_day: { gameId: g.id, day } } });
      expect((stored.details as { botPortfolios: unknown[] }).botPortfolios).toHaveLength(100);
      if (day < 3) {
        expect(report).not.toHaveProperty("leaderboard");
        expect(success(await request(`/${g.id}/reports/${day}`, g.token))).not.toHaveProperty("leaderboard");
        await g.locked();
        await g.send("next-day");
      }
    }
    const board = await g.board();
    expect(board).toMatchObject({ day: 3, settledDay: 3, totalParticipants: 101 });
    expect(board.entries).toHaveLength(10);
    expect(board.player.netWorthPence).toBe(g.state().netWorthPence);
    expect(g.state().reports[2].leaderboard).toEqual(board);
    expect((await g.load()).reports.slice(0, 2).every((report) => !("leaderboard" in report))).toBe(true);
    expect(await g.board()).toEqual(board);
  });

  it("uses final cash, savings, marked share values and the full outstanding debt balance", async () => {
    const g = await game();
    await g.send("open-market");
    await g.send("bank/deposit", { amountPence: 300_000 });
    await g.send("trades", { stockId: "NOVA", side: "BUY", quantity: 20 });
    await g.send("bank/loans/borrow", { amountPence: 500_000 });
    const trade = await fetchArbitrageTrade(server.baseUrl, g.id, g.token);
    await g.send("arbitrage/execute", trade.input);
    await g.locked();
    await finish(g);
    const board = await g.board(), state = g.state();
    expect(board.player).toMatchObject({ cashPence: state.wallet.cashPence, savingsPence: state.wallet.savingsPence,
      debtPence: state.loan.active!.balancePence, netWorthPence: state.netWorthPence });
    expect(board.player.debtPence).toBeGreaterThan(500_000);
    expect(board.player.stockValuePence).toBe(20 * state.stocks.find((stock) => stock.id === "NOVA")!.pricePence);
    expect(board.player.grossAssetsPence - board.player.debtPence).toBe(state.netWorthPence);
  });

  it("locks rankings again after reset and settles a fresh scenario", async () => {
    const g = await game();
    await finish(g);
    const previous = await server.prisma.gameSession.findUniqueOrThrow({ where: { id: g.id } });
    await g.send("reset");
    await g.locked();
    expect(g.state().reports).toEqual([]);
    expect((await server.prisma.gameSession.findUniqueOrThrow({ where: { id: g.id } })).seed).not.toBe(previous.seed);
    await finish(g);
    const expected = g.state().reports[2].leaderboard;
    expect(await g.board()).toEqual(expected);
    expect((await g.load()).reports[2].leaderboard).toEqual(expected);
  });

  it("removes early rankings from legacy report data and saved response replays", async () => {
    const g = await game();
    await g.send("open-market");
    await g.send("prediction", { direction: "NEUTRAL" });
    const input = { expectedVersion: g.state().version }, key = randomUUID();
    const response = await request<GameStateDTO>(`/${g.id}/end-day`, g.token, input, key);
    const closed = success(response);
    const earlyRanking = { day: 1, settledDay: 1, totalParticipants: 101, entries: [], player: { rank: 1 } };
    const stored = await server.prisma.dailyReport.findUniqueOrThrow({ where: { gameId_day: { gameId: g.id, day: 1 } } });
    await server.prisma.dailyReport.update({ where: { gameId_day: { gameId: g.id, day: 1 } },
      data: { details: JSON.parse(JSON.stringify({ ...(stored.details as object), leaderboard: earlyRanking })) } });
    await server.prisma.idempotencyRecord.update({ where: { gameId_key: { gameId: g.id, key } },
      data: { responseBody: JSON.parse(JSON.stringify({ ...response.body, data: { ...closed,
        reports: [{ ...closed.reports[0], leaderboard: earlyRanking }] } })) } });
    expect((await g.load()).reports[0]).not.toHaveProperty("leaderboard");
    expect(success(await request(`/${g.id}/reports/1`, g.token))).not.toHaveProperty("leaderboard");
    const replayed = success(await request<GameStateDTO>(`/${g.id}/end-day`, g.token, input, key));
    expect(replayed.reports[0]).not.toHaveProperty("leaderboard");
    await g.locked();
  });

  it("settles concurrent identical final End Day requests once", async () => {
    const g = await game();
    for (let day = 1; day < 3; day++) {
      await g.send("open-market");
      await g.send("prediction", { direction: "NEUTRAL" });
      await g.send("end-day");
      await g.send("next-day");
    }
    await g.send("open-market");
    await g.send("prediction", { direction: "NEUTRAL" });
    const input = { expectedVersion: g.state().version }, key = randomUUID();
    const results = await Promise.all([request<GameStateDTO>(`/${g.id}/end-day`, g.token, input, key),
      request<GameStateDTO>(`/${g.id}/end-day`, g.token, input, key)]);
    const closed = success(results[0]);
    expect(success(results[1])).toEqual(closed);
    expect(await g.board()).toEqual(closed.reports[2].leaderboard);
    expect(await server.prisma.dailyReport.count({ where: { gameId: g.id } })).toBe(3);
  });

  it("reconstructs finished legacy games without bot snapshots and keeps GET read-only", async () => {
    const g = await game();
    await finish(g);
    const expected = await g.board();
    const reports = await server.prisma.dailyReport.findMany({ where: { gameId: g.id } });
    for (const stored of reports) {
      const { botPortfolios: _bots, leaderboard: _board, ...legacy } = stored.details as Record<string, unknown>;
      await server.prisma.dailyReport.update({ where: { gameId_day: { gameId: g.id, day: stored.day } },
        data: { details: JSON.parse(JSON.stringify(legacy)) } });
    }
    expect(await g.board()).toEqual(expected);
    const reloaded = await server.prisma.dailyReport.findMany({ where: { gameId: g.id } });
    expect(reloaded.every((report) => !("botPortfolios" in (report.details as object)))).toBe(true);
  });
});
