import type { ApiResponse, ArbitragePuzzleDTO, ArbitrageRequest, BankTransferRequest,
  GameStateDTO, HealthDTO, NewsDTO, PredictionRequest, TradeRequest } from "@bullish/shared";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}

export interface GameSession { gameId: string; accessToken: string }
type WithoutVersion<T> = Omit<T, "expectedVersion">;
export type GameAction =
  | { type: "trades"; input: WithoutVersion<TradeRequest> }
  | { type: "bank/deposit" | "bank/withdraw"; input: WithoutVersion<BankTransferRequest> }
  | { type: "prediction"; input: WithoutVersion<PredictionRequest> }
  | { type: "arbitrage/execute"; input: WithoutVersion<ArbitrageRequest> }
  | { type: "open-market" | "end-day" | "next-day" | "reset"; input?: never };

async function request<T>(path: string, options: {
  session?: GameSession; input?: unknown; key?: string; signal?: AbortSignal;
} = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.session) headers.Authorization = `Bearer ${options.session.accessToken}`;
  if (options.key) headers["Idempotency-Key"] = options.key;
  if (options.input !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api${path}`, {
    method: options.input === undefined ? "GET" : "POST", headers,
    body: options.input === undefined ? undefined : JSON.stringify(options.input),
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });
  const body = await response.json() as ApiResponse<T>;
  if (!body.success) throw new ApiError(response.status, body.error.code, body.error.message);
  if (!response.ok) throw new ApiError(response.status, "HTTP_ERROR", "The server could not complete this request.");
  return body.data;
}

export const getHealth = (signal?: AbortSignal) => request<HealthDTO>("/health", { signal });
export const createGame = () => request<GameStateDTO & { accessToken: string }>("/games", { input: {} });
export const getGame = (session: GameSession, signal?: AbortSignal) =>
  request<GameStateDTO>(`/games/${session.gameId}`, { session, signal });
export const getNews = (session: GameSession, signal?: AbortSignal) =>
  request<NewsDTO>(`/games/${session.gameId}/news`, { session, signal });
export const getPuzzle = (session: GameSession, signal?: AbortSignal) =>
  request<ArbitragePuzzleDTO>(`/games/${session.gameId}/arbitrage`, { session, signal });
export const sendAction = (session: GameSession, type: GameAction["type"], input: unknown, key: string) =>
  request<GameStateDTO>(`/games/${session.gameId}/${type}`, { session, input, key });
