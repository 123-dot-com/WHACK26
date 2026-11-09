import type { ApiResponse, ApiSuccess, GameStateDTO, NewsDTO } from "@bullish/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";

type GameData = GameStateDTO & { accessToken?: string };
type ApiResult = { status: number; body: ApiResponse<GameData> };

let server: Awaited<ReturnType<typeof startTestServer>> | undefined;
let savePrediction: typeof import("../services/prediction.service.ts").savePrediction;

function fixture() {
  if (!server) throw new Error("Test server is not running.");
  return server;
}

beforeAll(async () => {
  server = await startTestServer();
  ({ savePrediction } = await import("../services/prediction.service.ts"));
});

afterAll(async () => {
  await server?.stop();
});

async function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(fixture().baseUrl + path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: response.status,
    body: await response.json() as ApiResponse<GameData>,
  };
}

function success(result: ApiResult, status = 200): ApiSuccess<GameData> {
  expect(result.status).toBe(status);
  if (!result.body.success) throw new Error(result.body.error.message);
  return result.body;
}

async function createGame() {
  const result = success(await request("POST", "/api/games", { body: {} }), 201);
  const token = result.data.accessToken;
  if (!token) throw new Error("Create Game must return an access token.");
  const news = await getNews(result.data.gameId, token);
  return { gameId: result.data.gameId, token, initial: result.data, news };
}

async function getNews(gameId: string, token: string) {
  const response = await fetch(`${fixture().baseUrl}/api/games/${gameId}/news`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
  const body = await response.json() as ApiResponse<NewsDTO>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}

function predict(gameId: string, token: string, direction: string, expectedVersion: number) {
  return request("POST", `/api/games/${gameId}/prediction`, {
    token,
    body: { direction, expectedVersion },
  });
}

describe("daily predictions over HTTP and PostgreSQL", () => {
  it("saves during BRIEFING, persists on GET, and survives opening the market", async () => {
    const game = await createGame();
    expect(game.initial.prediction).toBeNull();

    const saved = success(await predict(game.gameId, game.token, "BULLISH", 0));
    expect(saved).toMatchObject({
      stateVersion: 1,
      data: {
        version: 1,
        phase: "BRIEFING",
        prediction: { stockId: game.news.focusStockId, direction: "BULLISH" },
      },
    });
    expect(saved.data.wallet).toEqual(game.initial.wallet);
    expect(saved.data.stocks).toEqual(game.initial.stocks);
    expect(saved.data.netWorthPence).toBe(game.initial.netWorthPence);
    expect(saved.data).not.toHaveProperty("access");
    expect(saved.data).not.toHaveProperty("accessToken");

    const loaded = success(await request("GET", `/api/games/${game.gameId}`, {
      token: game.token,
    }));
    expect(loaded.data.prediction).toEqual(saved.data.prediction);

    const opened = success(await request("POST", `/api/games/${game.gameId}/open-market`, {
      token: game.token,
      body: { expectedVersion: 1 },
    }));
    expect(opened.data.phase).toBe("TRADING");
    expect(opened.data.version).toBe(2);
    expect(opened.data.prediction).toEqual(saved.data.prediction);
  });

  it("changes a prediction during TRADING without creating a second daily record", async () => {
    const game = await createGame();
    success(await request("POST", `/api/games/${game.gameId}/open-market`, {
      token: game.token,
      body: { expectedVersion: 0 },
    }));
    success(await predict(game.gameId, game.token, "NEUTRAL", 1));
    const changed = success(await predict(game.gameId, game.token, "BEARISH", 2));

    expect(changed.data).toMatchObject({
      version: 3,
      prediction: { stockId: game.news.focusStockId, direction: "BEARISH" },
      netWorthPence: game.initial.netWorthPence,
    });
    const rows = await fixture().prisma.prediction.findMany({ where: { gameId: game.gameId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ day: 1, stockId: game.news.focusStockId, direction: "BEARISH" });
  });

  it("rejects stale requests without changing the saved choice or version", async () => {
    const game = await createGame();
    success(await predict(game.gameId, game.token, "BULLISH", 0));
    const stale = await predict(game.gameId, game.token, "BEARISH", 0);
    expect(stale).toMatchObject({
      status: 409,
      body: { success: false, error: { code: "VERSION_CONFLICT" } },
    });
    const loaded = success(await request("GET", `/api/games/${game.gameId}`, { token: game.token }));
    expect(loaded.data.version).toBe(1);
    expect(loaded.data.prediction?.direction).toBe("BULLISH");
  });

  it("requires the token belonging to the requested game", async () => {
    const owner = await createGame();
    const other = await createGame();
    const body = { direction: "BULLISH", expectedVersion: 0 };

    const missing = await request("POST", `/api/games/${owner.gameId}/prediction`, { body });
    expect(missing.status).toBe(401);
    for (const token of ["invalid", other.token]) {
      const denied = await request("POST", `/api/games/${owner.gameId}/prediction`, { token, body });
      expect(denied.status).toBe(403);
    }
    expect(await fixture().prisma.prediction.count({ where: { gameId: owner.gameId } })).toBe(0);
    expect((await fixture().prisma.gameSession.findUniqueOrThrow({ where: { id: owner.gameId } })).version).toBe(0);
  });

  it.each([
    { direction: "UP", expectedVersion: 0 },
    { direction: "BULLISH", expectedVersion: "0" },
    { direction: "BULLISH", expectedVersion: 0, stockId: "GREEN" },
  ])("rejects malformed or client-selected prediction input: %j", async (body) => {
    const game = await createGame();
    const result = await request("POST", `/api/games/${game.gameId}/prediction`, {
      token: game.token,
      body,
    });
    expect(result).toMatchObject({
      status: 400,
      body: { success: false, error: { code: "INVALID_REQUEST" } },
    });
    expect(await fixture().prisma.prediction.count({ where: { gameId: game.gameId } })).toBe(0);
  });

  it.each(["REPORT", "FINISHED"] as const)("blocks prediction changes during %s", async (phase) => {
    const game = await createGame();
    await fixture().prisma.gameSession.update({ where: { id: game.gameId }, data: { phase } });

    const result = await predict(game.gameId, game.token, "BULLISH", 0);
    expect(result).toMatchObject({
      status: 409,
      body: { success: false, error: { code: "INVALID_PHASE" } },
    });
    expect(await fixture().prisma.prediction.count({ where: { gameId: game.gameId } })).toBe(0);
    expect((await fixture().prisma.gameSession.findUniqueOrThrow({ where: { id: game.gameId } })).version).toBe(0);
  });

  it("commits only one of two simultaneous requests using the same version", async () => {
    const game = await createGame();
    const results = await Promise.all([
      predict(game.gameId, game.token, "BULLISH", 0),
      predict(game.gameId, game.token, "BEARISH", 0),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const winner = success(results.find((result) => result.status === 200)!);
    const loaded = success(await request("GET", `/api/games/${game.gameId}`, { token: game.token }));
    expect(loaded.data.version).toBe(1);
    expect(loaded.data.prediction).toEqual(winner.data.prediction);
    expect(await fixture().prisma.prediction.count({ where: { gameId: game.gameId } })).toBe(1);
  });

  it("returns a prediction matching the returned version during concurrent reads and writes", async () => {
    const game = await createGame();
    const writes = async () => {
      for (let version = 0; version < 6; version++) {
        success(await predict(game.gameId, game.token, version % 2 === 0 ? "BULLISH" : "BEARISH", version));
      }
    };
    const reads = async () => {
      for (let i = 0; i < 12; i++) {
        const { data } = success(await request("GET", `/api/games/${game.gameId}`, { token: game.token }));
        const expected = data.version === 0 ? null : {
          stockId: game.news.focusStockId,
          direction: data.version % 2 === 1 ? "BULLISH" : "BEARISH",
        };
        expect(data.prediction).toEqual(expected);
      }
    };
    await Promise.all([writes(), reads()]);
  });

  it("keeps prediction history while returning only the current day's choice", async () => {
    const game = await createGame();
    success(await predict(game.gameId, game.token, "BULLISH", 0));
    const prices = await fixture().prisma.stockPrice.findMany({
      where: { gameID: game.gameId, day: 0 },
    });
    await fixture().prisma.$transaction([
      fixture().prisma.stockPrice.createMany({
        data: prices.map(({ stockID, pricePence }) => ({
          gameID: game.gameId, stockID, day: 1, pricePence,
        })),
      }),
      fixture().prisma.gameSession.update({
        where: { id: game.gameId },
        data: { day: 2, lastSimulatedDay: 1, version: { increment: 1 } },
      }),
    ]);

    const morning = success(await request("GET", `/api/games/${game.gameId}`, { token: game.token }));
    expect(morning.data.prediction).toBeNull();
    const news = await getNews(game.gameId, game.token);
    const saved = success(await predict(game.gameId, game.token, "NEUTRAL", 2));
    expect(saved.data.prediction).toEqual({ stockId: news.focusStockId, direction: "NEUTRAL" });
    expect(await fixture().prisma.prediction.count({ where: { gameId: game.gameId } })).toBe(2);
  });

  it("rolls back both the prediction and version if building the response fails", async () => {
    const game = await createGame();
    await fixture().prisma.stockPrice.deleteMany({
      where: { gameID: game.gameId, stockID: "NOVA", day: 0 },
    });

    await expect(savePrediction(game.gameId, {
      direction: "BULLISH", expectedVersion: 0,
    })).rejects.toThrow("Stock data is missing for NOVA");

    expect(await fixture().prisma.prediction.count({ where: { gameId: game.gameId } })).toBe(0);
    expect((await fixture().prisma.gameSession.findUniqueOrThrow({ where: { id: game.gameId } })).version).toBe(0);
  });
});
