import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";

export function calculateTransfer(
  cashPence: number, savingsPence: number, amountPence: number,
  operation: "DEPOSIT" | "WITHDRAW",
) {
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

export function calculateInterest(savingsPence: number, annualInterestBps: number) {
  // One game day represents one month; round half up to a whole penny.
  return checkedPence(Number((BigInt(savingsPence) * BigInt(annualInterestBps) + 60_000n) / 120_000n));
}
