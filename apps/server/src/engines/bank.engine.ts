import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";

export function calculateDepositedToday(
  transactions: readonly { day: number; operation: string; amountPence: number }[], day: number,
) {
  return transactions.reduce((total, transaction) => total + (
    transaction.day === day && transaction.operation === "DEPOSIT" ? transaction.amountPence : 0
  ), 0);
}

export function calculateTransfer(
  cashPence: number, savingsPence: number, amountPence: number,
  operation: "DEPOSIT" | "WITHDRAW",
  savingsDepositLimitPence: number,
  savingsDepositedTodayPence: number,
) {
  if (operation === "DEPOSIT" && amountPence > Math.max(0, savingsDepositLimitPence - savingsDepositedTodayPence)) {
    throw new AppError(422, "SAVINGS_LIMIT_EXCEEDED", "This deposit would exceed your daily Savings deposit limit.");
  }
  if (amountPence > (operation === "DEPOSIT" ? cashPence : savingsPence)) {
    throw new AppError(422, operation === "DEPOSIT" ? "INSUFFICIENT_CASH" : "INSUFFICIENT_SAVINGS",
      "Not enough money in the source account.");
  }
  const sign = operation === "DEPOSIT" ? 1 : -1;
  return {
    cashPence: checkedPence(cashPence - sign * amountPence),
    savingsPence: checkedPence(savingsPence + sign * amountPence),
  };
}

export function calculateInterest(savingsPence: number, monthlyInterestBps: number) {
  // One game day represents one month; round half up to a whole penny.
  return checkedPence(Number((BigInt(savingsPence) * BigInt(monthlyInterestBps) + 5_000n) / 10_000n));
}
