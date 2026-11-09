import { randomUUID } from "node:crypto";
import type { ApiResponse, GameStateDTO, LeaderboardDTO } from "@bullish/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";

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
    send: async (action: string, payload: Record<string, unknown> = {}) => {
      current = success(await request<GameStateDTO>(`/${id}/${action}`, token,
        { ...payload, expectedVersion: current.version }, randomUUID()));
      return current;
    },
  };
}

describe("wealth leaderboard over HTTP and PostgreSQL", () => {
  it("requires the session token and starts with 101 equally wealthy investors", async () => {
    const g = await game(), other = await game();
    expect((await request(`/${g.id}/leaderboard`)).status).toBe(401);
    expect((await request(`/${g.id}/leaderboard`, other.token)).status).toBe(403);
    const board = await g.board();
    expect(board).toMatchObject({ day: 1, settledDay: 0, totalParticipants: 101,
      player: { rank: 1, netWorthPence: 1_000_000 } });
    expect(board.entries).toHaveLength(10);
    expect(board.entries.every((entry) => entry.netWorthPence === 1_000_000)).toBe(true);
    expect(await g.board()).toEqual(board);
    expect((await server.prisma.gameSession.findUniqueOrThrow({ where: { id: g.id } })).version).toBe(0);
  });

  it("uses the player's live cash, savings, share values and full debt balance", async () => {
    const g = await game();
    await g.send("open-market");
    await g.send("bank/deposit", { amountPence: 300_000 });
    await g.send("trades", { stockId: "NOVA", side: "BUY", quantity: 20 });
    await g.send("bank/loans/borrow", { amountPence: 500_000 });
    expect((await g.board()).player).toMatchObject({ cashPence: 1_000_000, savingsPence: 300_000,
      stockValuePence: 200_000, grossAssetsPence: 1_500_000, debtPence: 500_000, netWorthPence: 1_000_000 });
    await g.send("arbitrage/execute", { puzzleId: "OIL-D1", route: "BUY_BUNDLE_SELL_UNITS", quantity: 1 });
    expect((await g.board()).player.netWorthPence).toBe(1_000_300);
    await g.send("bank/loans/repay");
    const board = await g.board();
    expect(board.player.netWorthPence).toBe(g.state().netWorthPence);
    expect(board.player).toMatchObject({ debtPence: 0, netWorthPence: 975_300, rank: 101 });
    await g.send("prediction", { direction: "NEUTRAL" });
    await g.send("end-day");
    const closed = await g.board();
    expect(closed.player.netWorthPence).toBe(g.state().netWorthPence);
    expect(closed.player.stockValuePence).toBe(20 * g.state().stocks.find((stock) => stock.id === "NOVA")!.pricePence);
  });

  it("persists bot portfolios, snapshots daily rankings, and replays the same scenario after reset", async () => {
    const g = await game();
    let first: LeaderboardDTO | undefined;
    for (let day = 1; day <= 3; day++) {
      await g.send("open-market");
      await g.send("prediction", { direction: "BULLISH" });
      await g.send("end-day");
      const board = await g.board();
      expect(board).toEqual(g.state().reports[day - 1].leaderboard);
      expect(board.player.netWorthPence).toBe(g.state().netWorthPence);
      expect(board).toMatchObject({ settledDay: day, totalParticipants: 101 });
      expect(board.entries).toHaveLength(10);
      if (day === 1) first = board;
      expect(g.state().reports[0].leaderboard).toEqual(first);
      expect(g.state().reports[day - 1]).not.toHaveProperty("botPortfolios");
      const stored = await server.prisma.dailyReport.findUniqueOrThrow({ where: { gameId_day: { gameId: g.id, day } } });
      expect((stored.details as { botPortfolios: unknown[] }).botPortfolios).toHaveLength(100);
      expect(await g.board()).toEqual(board);
      if (day < 3) await g.send("next-day");
    }
    await g.send("reset");
    expect((await g.board()).player).toMatchObject({ rank: 1, netWorthPence: 1_000_000 });
    expect(await server.prisma.dailyReport.count({ where: { gameId: g.id } })).toBe(0);
    await g.send("open-market");
    await g.send("prediction", { direction: "BULLISH" });
    await g.send("end-day");
    expect(await g.board()).toEqual(first);
  });

  it("does not advance bot finances twice for concurrent identical End Day requests", async () => {
    const g = await game();
    await g.send("open-market");
    await g.send("prediction", { direction: "NEUTRAL" });
    const input = { expectedVersion: g.state().version }, key = randomUUID();
    const results = await Promise.all([request<GameStateDTO>(`/${g.id}/end-day`, g.token, input, key),
      request<GameStateDTO>(`/${g.id}/end-day`, g.token, input, key)]);
    const closed = success(results[0]);
    expect(success(results[1])).toEqual(closed);
    expect(await g.board()).toEqual(closed.reports[0].leaderboard);
    expect(await server.prisma.dailyReport.count({ where: { gameId: g.id } })).toBe(1);
  });

  it("reconstructs older games without bot snapshots and leaves GET requests read-only", async () => {
    const g = await game();
    await g.send("open-market");
    await g.send("prediction", { direction: "BULLISH" });
    await g.send("end-day");
    const expected = await g.board();
    const stored = await server.prisma.dailyReport.findUniqueOrThrow({ where: { gameId_day: { gameId: g.id, day: 1 } } });
    const { botPortfolios: _bots, leaderboard: _board, ...legacy } = stored.details as Record<string, unknown>;
    await server.prisma.dailyReport.update({ where: { gameId_day: { gameId: g.id, day: 1 } }, data: { details: JSON.parse(JSON.stringify(legacy)) } });
    expect(await g.board()).toEqual(expected);
    const reloaded = await server.prisma.dailyReport.findUniqueOrThrow({ where: { gameId_day: { gameId: g.id, day: 1 } } });
    expect(reloaded.details).not.toHaveProperty("botPortfolios");
  });
});
