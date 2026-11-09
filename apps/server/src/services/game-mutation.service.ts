import { createHash } from "node:crypto";
import type { ApiSuccess, GamePhase, GameStateDTO, VersionRequest } from "@bullish/shared";
import { idempotencyKeySchema } from "@bullish/shared";
import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import { findGame, findRecordedRequest, incrementVersion, lockGame, recordRequest,
  type GameData, type Transaction } from "../repositories/game.repository.ts";
import { toGameState, toPublicReport } from "./game-state.mapper.ts";

export async function mutateGame<T extends VersionRequest>(options: {
  gameId: string; key: string; operation: string; input: T; phases: GamePhase[];
  apply: (tx: Transaction, game: GameData) => Promise<unknown>;
}): Promise<ApiSuccess<GameStateDTO>> {
  const { gameId, operation, input } = options;
  const key = idempotencyKeySchema.parse(options.key);
  // Input is parsed by strict schemas before this call, giving it a stable field order.
  const requestHash = createHash("sha256").update(JSON.stringify({ operation, input })).digest("hex");
  return prisma.$transaction(async (tx) => {
    if (!await lockGame(tx, gameId)) throw new AppError(404, "NOT_FOUND", "Game not found.");
    const recorded = await findRecordedRequest(tx, gameId, key);
    if (recorded) {
      if (recorded.requestHash !== requestHash) {
        throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This request key has already been used for a different action.");
      }
      const body = recorded.responseBody as unknown as ApiSuccess<GameStateDTO>;
      // Older saved responses may contain rankings from days one and two.
      return { ...body, data: { ...body.data, reports: body.data.reports.map((report) =>
        toPublicReport(report, body.data.phase === "FINISHED" && body.data.day === 3)) } };
    }
    const game = await findGame(tx, gameId);
    if (!game) throw new AppError(404, "NOT_FOUND", "Game not found.");
    if (game.version !== input.expectedVersion) {
      throw new AppError(409, "VERSION_CONFLICT", "Your game has changed. Reload and try again.");
    }
    if (!options.phases.includes(game.phase)) {
      throw new AppError(409, "INVALID_PHASE", "This action is not available in the current game phase.");
    }
    await options.apply(tx, game);
    await incrementVersion(tx, gameId);
    const updated = await findGame(tx, gameId);
    if (!updated) throw new Error("Updated game is missing.");
    const state = toGameState(updated);
    const body: ApiSuccess<GameStateDTO> = { success: true, data: state, stateVersion: state.version };
    await recordRequest(tx, gameId, key, requestHash, body);
    return body;
  }, { timeout: 10_000 });
}
