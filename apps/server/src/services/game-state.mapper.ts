import type { DailyReportDTO, GameStateDTO, StockId } from "@bullish/shared";
import { LOAN_DAILY_INTEREST_BPS, LOAN_MAX_PENCE } from "@bullish/shared";
import { repaymentQuote } from "../engines/loan.engine.ts";
import type { GameData } from "../repositories/game.repository.ts";
import { DAILY_STALL_COUNT } from "../engines/arbitrage.engine.ts";
import { calculateDepositedToday } from "../engines/bank.engine.ts";

export function toPublicReport(value: unknown, showFinalRanking: boolean): DailyReportDTO {
    const { botPortfolios: _bots, leaderboard, ...report } = value as DailyReportDTO & { botPortfolios?: unknown };
    return showFinalRanking && report.day === 3 && leaderboard ? { ...report, leaderboard } : report;
}

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

    const savedPrediction = game.predictions.find((p) => p.day === game.day);
    let prediction: GameStateDTO["prediction"] = null;

    if (savedPrediction) {
        const stockId = stockIds.find((id) => id === savedPrediction.stockId);
        if (!stockId) {
            throw new Error("Prediction stock is invalid.");
        }
        prediction = { stockId, direction: savedPrediction.direction };
    }

    let netWorthPence = wallet.cashPence + wallet.savingsPence;

    for (const stock of stocks) {
        netWorthPence += stock.quantityHeld * stock.pricePence;
    }

    const activeLoan = game.loans.find((loan) => loan.status === "ACTIVE");
    netWorthPence -= activeLoan?.balancePence ?? 0;
    const completedPuzzleIds = game.arbitrageAttempts.filter((attempt) => attempt.day === game.day).map((attempt) => attempt.puzzleId);

    return {
        gameId: game.id,
        day:game.day,
        phase: game.phase,
        version: game.version,
        wallet:{
            cashPence: wallet.cashPence,
            savingsPence: wallet.savingsPence,
            monthlyInterestBps: wallet.monthlyInterestBps,
            savingsDepositLimitPence: wallet.savingsDepositLimitPence,
            savingsDepositedTodayPence: calculateDepositedToday(game.bankTransactions, game.day),
        },
        stocks,
        prediction,
        arbitrage: { completedToday: completedPuzzleIds.length >= DAILY_STALL_COUNT,
            completedPuzzleIds, completedCount: completedPuzzleIds.length, dailyLimit: DAILY_STALL_COUNT },
        loan: {
            maxPrincipalPence: LOAN_MAX_PENCE,
            dailyInterestBps: LOAN_DAILY_INTEREST_BPS,
            lockedThroughDay: game.loanLockedThroughDay,
            canBorrow: game.phase === "TRADING" && !activeLoan && game.day > game.loanLockedThroughDay,
            active: activeLoan ? {
                id: activeLoan.id, principalPence: activeLoan.principalPence, balancePence: activeLoan.balancePence,
                repaymentPence: repaymentQuote(activeLoan).repaymentPence,
                borrowedDay: activeLoan.borrowedDay, dueDay: activeLoan.dueDay,
                overdue: activeLoan.lastAccruedDay >= activeLoan.dueDay,
            } : null,
        },
        netWorthPence,
        reports: game.reports.map((report) => toPublicReport(report.details,
            game.phase === "FINISHED" && game.day === 3 && game.lastSimulatedDay === 3)),
    };
}
