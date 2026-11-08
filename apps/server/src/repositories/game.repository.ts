import type { ApiSuccess, GameStateDTO } from "@bullish/shared";
import type { Prisma } from "../generated/prisma/client.ts";

export const gameStateInclude = {
  wallet: true,
  holdings: { include: { stock: true } },
  prices: true,
  predictions: true,
  arbitrageAttempts: true,
  reports: { orderBy: { day: "asc" } },
} as const;
export type GameData = Prisma.GameSessionGetPayload<{ include: typeof gameStateInclude }>;

export type Transaction = Prisma.TransactionClient;

export function findGame(tx: Transaction, gameId: string) {
  return tx.gameSession.findUnique({ where: { id: gameId }, include: gameStateInclude });
}

export async function lockGame(tx: Transaction, gameId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "GameSession" WHERE "id" = ${gameId} FOR UPDATE
  `;
  return rows.length > 0;
}

export function findRecordedRequest(tx: Transaction, gameId: string, key: string) {
  return tx.idempotencyRecord.findUnique({ where: { gameId_key: { gameId, key } } });
}

export function recordRequest(
  tx: Transaction, gameId: string, key: string, requestHash: string,
  body: ApiSuccess<GameStateDTO>,
) {
  return tx.idempotencyRecord.create({ data: { gameId, key, requestHash,
    responseBody: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue, statusCode: 200 } });
}

export function incrementVersion(tx: Transaction, gameId: string) {
  return tx.gameSession.update({ where: { id: gameId }, data: { version: { increment: 1 } } });
}
