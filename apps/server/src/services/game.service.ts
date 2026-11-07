import { prisma } from "../lib/prisma.ts";
import { createAccessToken, hashToken } from "../lib/token.ts"
import { toGameState } from "./game-state.mapper.ts";
import { dailyNews } from "../data/news.ts";
import { AppError } from "../lib/app-error.ts";
export async function createGame() {
    const accessToken = createAccessToken();
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
        include: {
            wallet: true,
            holdings: {
                include: {
                    stock: true,
                },
            },
            prices: true,
        },
    });

    return {
        game: toGameState(game),
        accessToken,
    };
}

export async function getGame(gameId: string) {
    const game = await prisma.gameSession.findUnique({
        where: {
            id: gameId,
        },
        include: {
            wallet: true,
            holdings: {
                include: {
                    stock: true,
                },
            },
            prices: true,
        },
    });
    if (!game) {
        return null;
    }
    return toGameState(game);
}

export async function getNews(gameId: string) {
  const game = await prisma.gameSession.findUnique({
    where: {
      id: gameId,
    },
    select: {
      day: true,
      version: true,
    },
  });

  if (!game) {
    return null;
  }

  const news = dailyNews.find((item) => item.day === game.day);

  if (!news) {
    throw new Error("News scenario is missing.");
  }

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
      include: {
        wallet: true,
        holdings: {
          include: {
            stock: true,
          },
        },
        prices: true,
      },
    });

    return toGameState(game);
  });
}

