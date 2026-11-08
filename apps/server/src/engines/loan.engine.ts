import { LOAN_DAILY_INTEREST_BPS, LOAN_MAX_PENCE } from "@bullish/shared";
import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";

export interface LoanBalance {
  id: string;
  principalPence: number;
  balancePence: number;
  borrowedDay: number;
  dueDay: number;
  lastAccruedDay: number;
}

export function loanInterest(balancePence: number) {
  return checkedPence(Number((BigInt(balancePence) * BigInt(LOAN_DAILY_INTEREST_BPS) + 5000n) / 10000n));
}

export function calculateBorrow(cashPence: number, amountPence: number, day: number,
  activeLoan: LoanBalance | null, lockedThroughDay: number) {
  if (!Number.isSafeInteger(amountPence) || amountPence <= 0 || amountPence > LOAN_MAX_PENCE) {
    throw new AppError(422, "INVALID_LOAN_AMOUNT", "Borrow between £0.01 and £10,000.00.");
  }
  if (activeLoan) throw new AppError(409, "ACTIVE_LOAN_EXISTS", "Repay your active loan before borrowing again.");
  if (day <= lockedThroughDay) throw new AppError(422, "LOAN_LOCKED", "Borrowing is locked through Day " + lockedThroughDay + ". You can still repay your debt.");
  return { cashPence: checkedPence(cashPence + amountPence), principalPence: amountPence,
    balancePence: amountPence, borrowedDay: day, dueDay: day + 1, lastAccruedDay: day - 1 };
}

export function repaymentQuote(loan: LoanBalance) {
  // Same-day repayment still pays the first day's interest; no interest-free loan cycling.
  const interestPence = loan.lastAccruedDay < loan.borrowedDay ? loanInterest(loan.balancePence) : 0;
  return { interestPence, repaymentPence: checkedPence(loan.balancePence + interestPence) };
}

export function calculateRepayment(cashPence: number, loan: LoanBalance | null) {
  if (!loan) throw new AppError(422, "NO_ACTIVE_LOAN", "You have no active loan to repay.");
  const quote = repaymentQuote(loan);
  if (cashPence < quote.repaymentPence) throw new AppError(422, "INSUFFICIENT_CASH", "Current Cash must cover the full loan repayment.");
  return { ...quote, cashPence: cashPence - quote.repaymentPence };
}

export function accrueLoan(loan: LoanBalance | null, day: number, lockedThroughDay: number) {
  if (!loan || loan.lastAccruedDay >= day) return null;
  const interestPence = loanInterest(loan.balancePence);
  const overdue = day >= loan.dueDay;
  return { loanId: loan.id, interestPence, balancePence: checkedPence(loan.balancePence + interestPence),
    lastAccruedDay: day, type: overdue ? "PENALTY" as const : "INTEREST" as const,
    lockedThroughDay: overdue ? Math.max(lockedThroughDay, day + 1) : lockedThroughDay };
}

export type LoanAccrual = NonNullable<ReturnType<typeof accrueLoan>>;
