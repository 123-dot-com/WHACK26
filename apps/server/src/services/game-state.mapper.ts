import type { GameStateDTO, StockId } from "@bullish/shared";
import type { Prisma } from "../generated/prisma/client.ts";

type GameData = Prisma.GameSessionGetPayload<{
    include: {
        wallet: true;
        holdings: { include: { stock: true } };
        prices: true;
    };
}>;

export function toGameState(game: GameData): GameStateDTO {
    const wallet = game.wallet;

    if (!wallet) {
        throw new Error("Game wallet is missing.");
    }

    const stockIds: StockId[] = ["NOVA", "GREEN", "FINX"];

    const stocks = stockIds.map((id) => {
        const holding = game.holdings.find((h) => h.stockID === id);
        const price = game.prices.find(
            (p) => p.stockID === id && p.day === game.lastSimulatedDay,
        );

        const previousClose = game.prices.find(
            (p) => p.stockID === id && p.day === game.day - 1,
        );
        if (!holding || !price || !previousClose) {
            throw new Error("Stock data is missing for " + id);
        }

        return {
            id,
            name: holding.stock.name,
            pricePence: price.pricePence,
            previousClosePence: previousClose.pricePence,
            quantityHeld: holding.quantity,
        };
    });

    let netWorthPence = wallet.cashPence +wallet.savingsPence;

    for (const stock of stocks) {
        netWorthPence += stock.quantityHeld * stock.pricePence;
    }

    return {
        gameId: game.id,
        day:game.day,
        phase: game.phase,
        version: game.version,
        wallet:{
            cashPence: wallet.cashPence,
            savingsPence: wallet.savingsPence,
            annualInterestBps: wallet.annualInterestBps,
        },
        stocks,
        prediction:null,
        arbitrage: {completedToday:false},
        netWorthPence,
    };
}