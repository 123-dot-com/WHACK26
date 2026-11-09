import type { PredictionRequest } from "@bullish/shared";
import { getPublishedNews } from "../data/news.ts";
import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import { toGameState } from "./game-state.mapper.ts";
import { gameStateInclude } from "../repositories/game.repository.ts";

export async function savePrediction(
  gameId: string,
  input: PredictionRequest,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.gameSession.findUnique({
      where: { id: gameId },
      select: { day: true, seed: true, dailyNews: true, phase: true, version: true },
    });

    if (!current) {
      throw new AppError(404, "NOT_FOUND", "Game not found.");
    }

    if (current.version !== input.expectedVersion) {
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "Reload the game and try again.",
      );
    }

    if (current.phase !== "BRIEFING" && current.phase !== "TRADING") {
      throw new AppError(
        409,
        "INVALID_PHASE",
        "Prediction is closed for this day.",
      );
    }

    const news = getPublishedNews(current, current.day);

    // Claim this version before saving so concurrent requests cannot both succeed.
    const updated = await tx.gameSession.updateMany({
      where: {
        id: gameId,
        version: input.expectedVersion,
        phase: { in: ["BRIEFING", "TRADING"] },
      },
      data: { version: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "Reload the game and try again.",
      );
    }

    await tx.prediction.upsert({
      where: { gameId_day: { gameId, day: current.day } },
      create: {
        gameId,
        day: current.day,
        stockId: news.focusStockId,
        direction: input.direction,
      },
      update: {
        stockId: news.focusStockId,
        direction: input.direction,
      },
    });

    const game = await tx.gameSession.findUniqueOrThrow({
      where: { id: gameId },
      include: gameStateInclude,
    });

    return toGameState(game);
  });
}
