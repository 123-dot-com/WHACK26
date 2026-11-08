import type { LoanAccrual } from "../engines/loan.engine.ts";
import type { GameData, Transaction } from "./game.repository.ts";

export async function persistBorrow(tx: Transaction, game: GameData, result: {
  cashPence: number; principalPence: number; balancePence: number; borrowedDay: number; dueDay: number; lastAccruedDay: number;
}) {
  const { cashPence, ...data } = result;
  await tx.wallet.update({ where: { gameId: game.id }, data: { cashPence } });
  const loan = await tx.loan.create({ data: { gameId: game.id, ...data } });
  await tx.loanEvent.create({ data: { gameId: game.id, loanId: loan.id, day: game.day, type: "BORROW", amountPence: data.principalPence } });
}

export async function persistRepayment(tx: Transaction, game: GameData, loanId: string,
  result: { cashPence: number; repaymentPence: number; interestPence: number }) {
  await tx.wallet.update({ where: { gameId: game.id }, data: { cashPence: result.cashPence } });
  if (result.interestPence > 0) await tx.loanEvent.create({ data: { gameId: game.id, loanId,
    day: game.day, type: "INTEREST", amountPence: result.interestPence } });
  await tx.loanEvent.create({ data: { gameId: game.id, loanId, day: game.day, type: "REPAY", amountPence: result.repaymentPence } });
  await tx.loan.update({ where: { id: loanId }, data: { balancePence: 0, status: "REPAID", repaidDay: game.day } });
}

export async function persistLoanAccrual(tx: Transaction, gameId: string, day: number, accrual: LoanAccrual | null) {
  if (!accrual) return;
  await tx.loan.update({ where: { id: accrual.loanId }, data: { balancePence: accrual.balancePence, lastAccruedDay: accrual.lastAccruedDay } });
  await tx.loanEvent.create({ data: { gameId, loanId: accrual.loanId, day, type: accrual.type, amountPence: accrual.interestPence } });
  await tx.gameSession.update({ where: { id: gameId }, data: { loanLockedThroughDay: accrual.lockedThroughDay } });
}
