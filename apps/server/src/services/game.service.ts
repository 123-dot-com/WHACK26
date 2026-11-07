import { prisma } from "../lib/prisma.ts";
import { createAccessToken, hashToken } from "../lib/token.ts"
import { toGameState } from "./game-state.mapper.ts";
import { dailyNews } from "../data/news.ts";
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

