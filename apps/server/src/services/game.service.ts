import { randomInt } from "node:crypto";
import { prisma } from "../lib/prisma.ts";
import { createAccessToken, hashToken } from "../lib/token.ts"
import { toGameState } from "./game-state.mapper.ts";
import { gameStateInclude } from "../repositories/game.repository.ts";
import { getPublishedNews, prepareDailyNews } from "../data/news.ts";
import { AppError } from "../lib/app-error.ts";
export async function createGame() {
    const accessToken = createAccessToken();
    const seed = randomInt(0, 2_147_483_648);
    const news = prepareDailyNews({ seed, day: 0, dailyNews: {}, newsHistory: [] }, 1);
    const stocks = await prisma.stock.findMany({
        where: {
            id: { in: ["NOVA", "GREEN", "FINX"] },
        },
        orderBy: {
            id: "asc",
        },
    });
    if (stocks.length !== 3) {
        throw new Error("Run db:seed before creating a game.");
    }
    const game = await prisma.gameSession.create({
        data: {
            seed,
            ...news,
            wallet: {
                create: {},
            },
            access: {
                create: {
                    code: hashToken(accessToken),
                },
            },
            holdings: {
                create: stocks.map((stock) => ({
                    stockID: stock.id,
                    quantity: 0,
                })),
            },
            prices: {
                create: stocks.map((stock) => ({
                    stockID: stock.id,
                    day: 0,
                    pricePence: stock.initialPricePence,
                })),
            },
        },
        include: gameStateInclude,
    });

    return {
        game: toGameState(game),
        accessToken,
    };
}

export async function getGame(gameId: string) {
    return prisma.$transaction(async (tx) => {
        const game = await tx.gameSession.findUnique({
            where: { id: gameId },
            include: gameStateInclude,
        });
        return game ? toGameState(game) : null;
    }, { isolationLevel: "RepeatableRead" });
}

export async function getNews(gameId: string) {
  const game = await prisma.gameSession.findUnique({
    where: {
      id: gameId,
    },
    select: {
      day: true,
      seed: true,
      dailyNews: true,
      version: true,
    },
  });

  if (!game) {
    return null;
  }

  const news = getPublishedNews(game, game.day);

  return {
    news,
    version: game.version,
  };
}

export async function openMarket(
  gameId: string,
  expectedVersion: number,
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.gameSession.updateMany({
      where: {
        id: gameId,
        version: expectedVersion,
        phase: "BRIEFING",
      },
      data: {
        phase: "TRADING",
        version: {
          increment: 1,
        },
      },
    });

    if (updated.count === 0) {
      const current = await tx.gameSession.findUnique({
        where: { id: gameId },
        select: { version: true },
      });

      if (!current) {
        throw new AppError(404, "NOT_FOUND", "Game not found.");
      }

      if (current.version !== expectedVersion) {
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "Reload the game and try again.",
        );
      }

      throw new AppError(
        409,
        "INVALID_PHASE",
        "The market can only open during BRIEFING.",
      );
    }

    const game = await tx.gameSession.findUniqueOrThrow({
      where: { id: gameId },
      include: gameStateInclude,
    });

    return toGameState(game);
  });
}

